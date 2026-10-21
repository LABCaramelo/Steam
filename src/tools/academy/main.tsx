import { useMemo } from "react";
import { mountTool } from "../shared/mount";
import { useToolUser } from "../shared/kit";
import { AcademyApp } from "./AcademyApp";
import { createAcademyRepo } from "./repo";
import "./academy.css";

function ConnectedAcademy() {
  const user = useToolUser();
  const repo = useMemo(() => createAcademyRepo(user.id), [user.id]);
  return <AcademyApp key={user.id} repo={repo} />;
}
mountTool({ slug: "academy", appid: 5, name: "Academy" }, <ConnectedAcademy />);
