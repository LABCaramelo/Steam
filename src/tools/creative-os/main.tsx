import { CREATIVE_OS_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { CreativeOsApp } from "./CreativeOsApp";
import { supabaseCreativeOs } from "./repo";
import "./creative-os.css";

mountTool(
  { slug: "creative-os", appid: CREATIVE_OS_APP_ID, name: "Creative OS" },
  <CreativeOsApp repo={supabaseCreativeOs} />,
);
