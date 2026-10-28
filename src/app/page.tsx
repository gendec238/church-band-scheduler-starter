import Planner from "./planner";
export const dynamic = "force-dynamic";
export default function Page() { return <Planner churchName={process.env.CHURCH_NAME || "My Church"} />; }
