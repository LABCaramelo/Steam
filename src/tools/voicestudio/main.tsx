import { mountTool } from "../shared/mount";
import { VOICESTUDIO_APP_ID } from "../../toolCatalog";
import { VoiceStudioApp } from "./VoiceStudioApp";

mountTool(
  {
    slug: "voicestudio",
    appid: VOICESTUDIO_APP_ID,
    name: "Voice Studio",
  },
  <VoiceStudioApp />,
  {
    allowAnonymous: true,
    forceTheme: "dark",
  }
);
