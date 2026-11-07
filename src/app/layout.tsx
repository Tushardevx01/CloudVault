import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloudVault - Modern Cloud Storage & Personal Workspace",
  description:
    "Fast, private, and frictionless personal cloud file workspace. Store, preview, and organize your files with instant inline preview and bank-grade encryption.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(e) {
                  var file = e.filename || (e.error && e.error.stack) || '';
                  if (typeof file === 'string' && (file.indexOf('chrome-extension://') !== -1 || file.indexOf('moz-extension://') !== -1)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = (e.reason && (e.reason.stack || e.reason.message)) || '';
                  if (typeof reason === 'string' && (reason.indexOf('chrome-extension://') !== -1 || reason.indexOf('moz-extension://') !== -1)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
              }
            `,
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-slate-50 text-slate-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
