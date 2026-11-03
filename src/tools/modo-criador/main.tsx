import { GABINETE_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { GabineteApp } from "../gabinete/GabineteApp";
import { supabaseGabinete } from "../gabinete/repo";
import "../gabinete/gabinete.css";

mountTool(
  { slug: "modo-criador", appid: GABINETE_APP_ID, name: "Gabinete" },
  <GabineteApp repo={supabaseGabinete} />,
);
