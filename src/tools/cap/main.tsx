import { mountTool } from "../shared/mount";
import { CAP_APP_ID } from "../../toolCatalog";
import { CapApp } from "./CapApp";

mountTool(
  {
    slug: "cap",
    appid: CAP_APP_ID,
    name: "Cap",
  },
  <CapApp />,
  {
    allowAnonymous: true,
    forceTheme: "dark",
  }
);
