import { CREATIVE_OS_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { GabineteApp } from "../gabinete/GabineteApp";
import { supabaseGabinete } from "../gabinete/repo";
import "../gabinete/gabinete.css";

mountTool(
  { slug: "creative-os", appid: CREATIVE_OS_APP_ID, name: "Gabinete" },
  <GabineteApp repo={supabaseGabinete} />,
);
