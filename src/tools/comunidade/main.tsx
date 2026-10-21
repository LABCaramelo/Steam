import { mountTool } from "../shared/mount";
import { useToolUser } from "../shared/kit";
import { App } from "./App";
import "./styles.css";

function ConnectedComunidade() {
  const user = useToolUser();
  return <App key={user.id} user={user} />;
}

mountTool({ slug: "comunidade", appid: 7, name: "Comunidade" }, <ConnectedComunidade />);
