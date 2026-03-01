import argparse
import base64
import json
import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import boto3
from botocore.exceptions import ClientError


@dataclass(frozen=True)
class Product:
    id: str
    name: str
    age_group: str
    category: str
    price_usd: float
    sizes: list[str]
    colors: list[str]
    product_description: str
    inventory: int


def _extract_products_block(ts_source: str) -> str:
    match = re.search(
        r"export const PRODUCTS: Product\[]\s*=\s*\[(.*?)]\s*;",
        ts_source,
        re.DOTALL,
    )
    if not match:
        raise ValueError("Could not locate PRODUCTS array in data.ts")
    return match.group(1)


def _ts_objects_to_json(text: str) -> str:
    # Quote object keys and remove trailing commas to make JSON.
    text = re.sub(r"([{\s,])([a-zA-Z_][\w]*)\s*:", r'\1"\2":', text)
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    text = re.sub(r",\s*$", "", text)
    return f"[{text}]"


def load_products_from_ts(path: Path) -> list[Product]:
    ts_source = path.read_text(encoding="utf-8")
    block = _extract_products_block(ts_source)
    json_text = _ts_objects_to_json(block)
    raw_products = json.loads(json_text)
    return [
        Product(
            id=item["id"],
            name=item["name"],
            age_group=item["ageGroup"],
            category=item["category"],
            price_usd=item["priceUsd"],
            sizes=item["sizes"],
            colors=item["colors"],
            product_description=item["productDescription"],
            inventory=item["inventory"],
        )
        for item in raw_products
    ]


def build_description(product: Product) -> str:
    color_hint = ", ".join(product.colors[:2])
    size_hint = ", ".join(product.sizes[:3])
    return (
        f"{product.name} is a {product.category} staple for {product.age_group}."
        f" Crafted for daily wear with a comfortable fit, it comes in {color_hint}"
        f" and sizes {size_hint}. Finished with durable details for long-lasting use."
    )


def build_image_prompt(product: Product) -> str:
    color_hint = ", ".join(product.colors[:2])
    return (
        f"Studio product photo of a {product.category} item named {product.name},"
        f" color palette {color_hint}, minimal background, soft diffused lighting,"
        " realistic fabric texture, centered composition, no text, no logos."
    )


def iter_products(products: Iterable[Product]) -> Iterable[dict[str, Any]]:
    for product in products:
        yield {
            "id": product.id,
            "name": product.name,
            "description": build_description(product),
            "image_prompt": build_image_prompt(product),
        }


def invoke_text_model(
    client,
    model_id: str,
    prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 200,
) -> str:
    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
        }
    )
    try:
        response = client.invoke_model(modelId=model_id, body=body)
    except ClientError as exc:
        raise RuntimeError(f"Bedrock text model error for '{model_id}'.") from exc
    payload = json.loads(response["body"].read())
    return payload["content"][0]["text"].strip()


def invoke_image_model(
    client,
    model_id: str,
    prompt: str,
    width: int,
    height: int,
    quality: str,
    cfg_scale: float,
) -> bytes:
    body = json.dumps(
        {
            "taskType": "TEXT_IMAGE",
            "textToImageParams": {"text": prompt},
            "imageGenerationConfig": {
                "numberOfImages": 1,
                "quality": quality,
                "width": width,
                "height": height,
                "cfgScale": cfg_scale,
            },
        }
    )
    try:
        response = client.invoke_model(modelId=model_id, body=body)
    except ClientError as exc:
        raise RuntimeError(f"Bedrock image model error for '{model_id}'.") from exc
    payload = json.loads(response["body"].read())
    encoded = payload.get("images", [None])[0]
    if not encoded:
        raise RuntimeError(f"No image returned from {model_id}")
    return base64.b64decode(encoded)


def invoke_strands_image(prompt: str, target_path: Path) -> None:
    try:
        from strands import Agent
        from strands_tools import generate_image
    except ImportError as exc:  # pragma: no cover - runtime only
        raise RuntimeError(
            "strands_tools is not installed. Add it to your environment to use --image-provider strands."
        ) from exc

    agent = Agent(
        tools=[generate_image],
        system_prompt=(
            "You generate exactly one image from the prompt. "
            "Return ONLY a single filesystem path to the generated image."
        ),
    )
    result = str(agent(prompt))
    match = re.search(r"([A-Za-z]:[^\s,]+\.png|[^\s,]+\.png)", result)
    if not match:
        raise RuntimeError(f"Strands image tool did not return a PNG path. Output: {result}")
    source_path = Path(match.group(1)).expanduser().resolve()
    if not source_path.exists():
        raise RuntimeError(f"Strands image path does not exist: {source_path}")
    target_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_path, target_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate product text and images.")
    parser.add_argument(
        "--data",
        default="../state-client/app/data.ts",
        help="Path to data.ts",
    )
    parser.add_argument(
        "--out",
        default="../state-client/generated-assets",
        help="Output folder for descriptions and images",
    )
    parser.add_argument(
        "--use-bedrock-text",
        action="store_true",
        help="Generate descriptions with Bedrock text model",
    )
    parser.add_argument(
        "--generate-images",
        action="store_true",
        help="Generate product images with Bedrock image model",
    )
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=1024)
    parser.add_argument("--quality", default="standard")
    parser.add_argument("--cfg-scale", type=float, default=8.0)
    parser.add_argument("--text-model-id", default=None)
    parser.add_argument("--image-model-id", default=None)
    parser.add_argument(
        "--image-provider",
        choices=["bedrock", "strands"],
        default="bedrock",
        help="Image generator to use when --generate-images is set",
    )
    args = parser.parse_args()

    data_path = Path(args.data).resolve()
    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    images_dir = out_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    products = load_products_from_ts(data_path)
    runtime = boto3.client(
        "bedrock-runtime", region_name=os.getenv("AWS_DEFAULT_REGION", "us-west-2")
    )

    text_model_id = args.text_model_id or os.getenv(
        "BEDROCK_TEXT_MODEL_ID", "us.anthropic.claude-sonnet-4-20250514-v1:0"
    )
    image_model_id = args.image_model_id or os.getenv(
        "BEDROCK_IMAGE_MODEL_ID", "amazon.titan-image-generator-v2"
    )

    output_rows = []
    for product in products:
        description = build_description(product)
        if args.use_bedrock_text:
            prompt = (
                "Write a short, premium product description (1-2 sentences) for a clothing item.\n"
                f"Name: {product.name}\n"
                f"Category: {product.category}\n"
                f"Age group: {product.age_group}\n"
                f"Colors: {', '.join(product.colors)}\n"
                f"Sizes: {', '.join(product.sizes)}\n"
                f"Price: ${product.price_usd}\n"
                "Avoid markdown and keep it under 40 words."
            )
            description = invoke_text_model(runtime, text_model_id, prompt)

        image_file = None
        if args.generate_images:
            prompt = build_image_prompt(product)
            image_file = images_dir / f"{product.id}.png"
            if args.image_provider == "strands":
                invoke_strands_image(prompt, image_file)
            else:
                image_bytes = invoke_image_model(
                    runtime,
                    image_model_id,
                    prompt,
                    args.width,
                    args.height,
                    args.quality,
                    args.cfg_scale,
                )
                image_file.write_bytes(image_bytes)

        output_rows.append(
            {
                "id": product.id,
                "name": product.name,
                "description": description,
                "image": str(image_file) if image_file else None,
            }
        )

    (out_dir / "product_descriptions.json").write_text(
        json.dumps(output_rows, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
