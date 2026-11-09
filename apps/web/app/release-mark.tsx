import { SITE_VERSION } from "../config/site";
import Link from "next/link";
export default function ReleaseMark(){return <><span className="version-badge">{SITE_VERSION}</span> <Link className="release-candidate-mark" href="/release-candidate"><span className="rc-flames" aria-hidden="true">🔥</span>Release Candidate</Link> <span className="release-date">10 Kasım 2026</span></>;}
