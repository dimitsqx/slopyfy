import { CopilotKit } from "@copilotkit/react-core";
// import "./globals.css";
import "@copilotkit/react-ui/styles.css";

// ...

export default function RootLayout({ children }: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit" agent="strands_agent">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
