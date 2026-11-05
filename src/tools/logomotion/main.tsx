import { mountTool } from "../shared/mount";
import { LOGOMOTION_APP_ID } from "../../toolCatalog";
import { LogoMotionApp } from "./LogoMotionApp";

mountTool(
  {
    slug: "logomotion",
    appid: LOGOMOTION_APP_ID,
    name: "Logo Motion",
  },
  <LogoMotionApp />,
  {
    allowAnonymous: true,
    forceTheme: "dark",
  }
);
