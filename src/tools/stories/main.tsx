import { mountTool } from "../shared/mount";
import { STORIES_APP_ID } from "../../toolCatalog";
import { StoriesApp } from "./StoriesApp";

mountTool(
  {
    slug: "stories",
    appid: STORIES_APP_ID,
    name: "Stories Maker",
  },
  <StoriesApp />,
  {
    allowAnonymous: true,
    forceTheme: "dark",
  }
);
