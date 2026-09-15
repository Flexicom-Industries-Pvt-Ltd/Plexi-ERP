import { Metadata } from "next";
import { ApiDocsClient } from "./api-docs-client";

export const metadata: Metadata = {
  title: "API Documentation | Plexi-ERP",
  description: "Interactive OpenAPI reference and modular API endpoint directory for Flexicom Plexi-ERP.",
};

export const dynamic = "force-dynamic";

export default function ApiDocsPage() {
  return <ApiDocsClient />;
}
