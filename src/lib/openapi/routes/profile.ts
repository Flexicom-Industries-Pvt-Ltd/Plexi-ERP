import { reg } from "../helpers";
import { ChangePasswordBody, SuccessSchema, UpdateProfileBody } from "../schemas";

const TAG = ["Profile"];

export function registerProfileRoutes() {
  reg({
    method: "patch",
    path: "/api/profile",
    summary: "Update user profile",
    tags: TAG,
    body: UpdateProfileBody,
    response: SuccessSchema,
  });
  reg({
    method: "patch",
    path: "/api/profile/password",
    summary: "Change password",
    tags: TAG,
    body: ChangePasswordBody,
    response: SuccessSchema,
    responses: { 400: { description: "Invalid current password" } },
  });
}
