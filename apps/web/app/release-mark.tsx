import { SITE_RELEASE_MONTH, SITE_VERSION } from "../config/site";
const releaseDate = new Date(`${SITE_RELEASE_MONTH}-01T12:00:00Z`);
const releaseMonth = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(releaseDate);
export default function ReleaseMark({academicYear}:{academicYear?:string}){return <><span className="version-badge">{SITE_VERSION}</span> <span className="release-date">{academicYear??releaseMonth}</span></>;}
