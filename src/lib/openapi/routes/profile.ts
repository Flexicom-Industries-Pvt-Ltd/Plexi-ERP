import { reg } from "../helpers";

const TAG = ["Profile"];

export function registerProfileRoutes() {
  reg({
    method: "patch",
    path: "/api/profile",
    summary: "Update user profile",
    tags: TAG,
    description: "Update name and phone for the authenticated user.",
  });
  reg({
    method: "patch",
    path: "/api/profile/password",
    summary: "Change password",
    tags: TAG,
    description: "Requires current password and new password.",
    responses: { 400: { description: "Invalid current password" } },
  });
}
