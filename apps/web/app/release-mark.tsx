import { SITE_RELEASE_MONTH, SITE_VERSION } from "../config/site";
import Link from "next/link";
const releaseDate = new Date(`${SITE_RELEASE_MONTH}-01T12:00:00Z`);
const releaseMonth = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(releaseDate);
export default function ReleaseMark(){return <><span className="version-badge">{SITE_VERSION}</span> <Link className="release-candidate-mark" href="/release-candidate"><span className="rc-flames" aria-hidden="true">🔥</span>Release Candidate</Link> <span className="release-date">{releaseMonth}</span></>;}
