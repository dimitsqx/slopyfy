import "./globals.css";
import CopilotProvider from "./copilot-provider";

// ...

export default function RootLayout({ children }: {children: React.ReactNode}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0 overflow-hidden">
        <CopilotProvider>{children}</CopilotProvider>
      </body>
    </html>
  );
}