"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

export default function ApiDocsPage() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-hidden">
      <ApiReferenceReact
        configuration={{
          spec: {
            url: "/api/swagger",
          },
          theme: "default",
          layout: "modern",
          showSidebar: true,
          hideModels: true,
          hideDownloadButton: false,
        }}
      />
    </div>
  );
}
