import { GABINETE_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { GabineteApp } from "./GabineteApp";
import { supabaseGabinete } from "./repo";
import "./gabinete.css";

mountTool(
  { slug: "gabinete", appid: GABINETE_APP_ID, name: "Gabinete" },
  <GabineteApp repo={supabaseGabinete} />,
  { forceTheme: "dark" },
);
