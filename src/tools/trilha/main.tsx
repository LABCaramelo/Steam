import { mountTool } from "../shared/mount";
import { TRILHA_APP_ID } from "../../toolCatalog";
import { TrilhaApp } from "./TrilhaApp";

mountTool(
  {
    slug: "trilha",
    appid: TRILHA_APP_ID,
    name: "Trilha",
  },
  <TrilhaApp />,
  {
    allowAnonymous: true,
    forceTheme: "dark",
  }
);
