import { mountTool } from "../shared/mount";
import { PELICULA_APP_ID } from "../../toolCatalog";
import { PeliculaApp } from "./PeliculaApp";

mountTool(
  {
    slug: "pelicula",
    appid: PELICULA_APP_ID,
    name: "Película",
  },
  <PeliculaApp />,
  {
    allowAnonymous: true,
    forceTheme: "dark",
  }
);
