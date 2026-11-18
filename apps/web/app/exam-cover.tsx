"use client";
import UiIcon from "./ui-icon";

import { useState } from "react";
export type CoverExam = { examName: string; grade: number; coverImage?: string | null; publisher: { name: string } };
export default function ExamCover({ item }: { item: CoverExam }) {
  const [failed, setFailed] = useState(false);
  return <div className="book-cover">{item.coverImage && !failed ? <img src={item.coverImage} alt={`${item.examName} kapağı`} loading="lazy" width="450" height="600" onError={() => setFailed(true)} /> : <div className="default-book-cover"><span>{item.publisher.name}</span><strong>{item.examName}</strong><small>{item.grade}. Sınıf <b aria-hidden="true"><UiIcon name="arrow"/></b></small></div>}</div>;
}
