import { mountTool } from "../shared/mount";
import { CADERNO_APP_ID } from "../../toolCatalog";
import { CadernoApp } from "./CadernoApp";

mountTool(
  {
    slug: "caderno",
    appid: CADERNO_APP_ID,
    name: "Caderno",
  },
  <CadernoApp />,
  {
    allowAnonymous: true,
  }
);
