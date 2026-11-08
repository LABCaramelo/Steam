import { mountTool } from "../shared/mount";
import { AMPLIA_APP_ID } from "../../toolCatalog";
import { AmpliaApp } from "./AmpliaApp";

mountTool(
  {
    slug: "amplia",
    appid: AMPLIA_APP_ID,
    name: "Amplia",
  },
  <AmpliaApp />,
  {
    allowAnonymous: true,
    forceTheme: "dark",
  }
);
