import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import "./globals.css";

// ...

export default function RootLayout({ children }: {children: React.ReactNode}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0 overflow-hidden">
        <CopilotKit runtimeUrl="/api/copilotkit" agent="strands_agent">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}