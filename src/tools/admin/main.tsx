import { ADMIN_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { AdminApp } from "./AdminApp";

mountTool(
  { slug: "admin", appid: ADMIN_APP_ID, name: "Administração do LAB" },
  <AdminApp />
);
