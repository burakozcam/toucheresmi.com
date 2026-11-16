# v1.3.2 API endpoint envanteri

Çalışan Express router ağacından çıkarıldı. “Oturum” satırları anonim HTTP isteğiyle 401; admin satırları ayrıca bayi JWT ile 403 olarak test edildi. Public satırlar üyelik şartı olmayan katalog, CAPTCHA veya süreli capability kontrollerine tabidir. Kaynak kodundaki nesne kapsamı ayrıca incelendi; 401/403 tek başına IDOR testi sayılmaz.

| Yöntem | Tam yol | Erişim |
|---|---|---|
| GET | `/api/account` | Oturum / rol |
| PATCH | `/api/account` | Oturum / rol |
| PATCH | `/api/account/password` | Oturum / rol |
| GET | `/api/admin/answer-key-files/:id` | Oturum / rol |
| GET | `/api/admin/answer-keys` | Oturum / rol |
| POST | `/api/admin/answer-keys` | Oturum / rol |
| DELETE | `/api/admin/answer-keys/:id` | Oturum / rol |
| PATCH | `/api/admin/answer-keys/:id` | Oturum / rol |
| PATCH | `/api/admin/answer-keys/:id/cover` | Oturum / rol |
| GET | `/api/admin/answer-keys/:id/pdf` | Oturum / rol |
| GET | `/api/admin/answer-keys/:id/pdf-info` | Oturum / rol |
| GET | `/api/admin/applications` | Oturum / rol |
| GET | `/api/admin/audit-log-users` | Oturum / rol |
| GET | `/api/admin/audit-logs` | Oturum / rol |
| GET | `/api/admin/blog` | Oturum / rol |
| POST | `/api/admin/blog` | Oturum / rol |
| DELETE | `/api/admin/blog/:id` | Oturum / rol |
| GET | `/api/admin/blog/:id` | Oturum / rol |
| PATCH | `/api/admin/blog/:id` | Oturum / rol |
| POST | `/api/admin/bulk-exams` | Oturum / rol |
| GET | `/api/admin/contact-messages` | Oturum / rol |
| PATCH | `/api/admin/contact-messages/:id` | Oturum / rol |
| GET | `/api/admin/dealer-management/activities` | Oturum / rol |
| GET | `/api/admin/dealer-management/dealers` | Oturum / rol |
| POST | `/api/admin/dealer-management/dealers` | Oturum / rol |
| GET | `/api/admin/dealer-management/dealers/:id` | Oturum / rol |
| PATCH | `/api/admin/dealer-management/dealers/:id` | Oturum / rol |
| POST | `/api/admin/dealer-management/dealers/:id/impersonate` | Oturum / rol |
| POST | `/api/admin/dealer-management/dealers/:id/users` | Oturum / rol |
| GET | `/api/admin/dealer-management/location-requests` | Oturum / rol |
| POST | `/api/admin/dealer-management/location-requests/:id/review` | Oturum / rol |
| GET | `/api/admin/dealers` | Oturum / rol |
| POST | `/api/admin/exam-definitions` | Oturum / rol |
| DELETE | `/api/admin/exam-schedule` | Oturum / rol |
| GET | `/api/admin/exam-schedule` | Oturum / rol |
| POST | `/api/admin/exam-schedule` | Oturum / rol |
| PATCH | `/api/admin/exam-schedule-bulk` | Oturum / rol |
| PATCH | `/api/admin/exam-schedule/:id` | Oturum / rol |
| GET | `/api/admin/file-export` | Oturum / rol |
| DELETE | `/api/admin/file-shares/:id` | Oturum / rol |
| GET | `/api/admin/files` | Oturum / rol |
| POST | `/api/admin/files` | Oturum / rol |
| DELETE | `/api/admin/files/:id` | Oturum / rol |
| PATCH | `/api/admin/files/:id` | Oturum / rol |
| GET | `/api/admin/files/:id/download` | Oturum / rol |
| GET | `/api/admin/files/:id/shares` | Oturum / rol |
| POST | `/api/admin/files/:id/shares` | Oturum / rol |
| GET | `/api/admin/folder-tree` | Oturum / rol |
| POST | `/api/admin/folders` | Oturum / rol |
| DELETE | `/api/admin/folders/:id` | Oturum / rol |
| PATCH | `/api/admin/folders/:id` | Oturum / rol |
| POST | `/api/admin/outcome-preview` | Oturum / rol |
| GET | `/api/admin/publisher-aliases` | Oturum / rol |
| PUT | `/api/admin/publisher-aliases` | Oturum / rol |
| DELETE | `/api/admin/publisher-aliases/:id` | Oturum / rol |
| GET | `/api/admin/publisher-logos/` | Oturum / rol |
| DELETE | `/api/admin/publisher-logos/:id` | Oturum / rol |
| PUT | `/api/admin/publisher-logos/:id` | Oturum / rol |
| GET | `/api/admin/publisher-requests` | Oturum / rol |
| PATCH | `/api/admin/publisher-requests/:id` | Oturum / rol |
| GET | `/api/admin/publishers` | Oturum / rol |
| POST | `/api/admin/publishers` | Oturum / rol |
| DELETE | `/api/admin/publishers/:id` | Oturum / rol |
| PATCH | `/api/admin/publishers/:id` | Oturum / rol |
| GET | `/api/admin/registration-requests` | Oturum / rol |
| PATCH | `/api/admin/registration-requests/:id` | Oturum / rol |
| GET | `/api/admin/schedule-imports` | Oturum / rol |
| POST | `/api/admin/schedule-imports/:id/rollback` | Oturum / rol |
| GET | `/api/admin/school-duplicate-attempts` | Oturum / rol |
| PATCH | `/api/admin/school-duplicate-attempts/:id` | Oturum / rol |
| PATCH | `/api/admin/schools/:id` | Oturum / rol |
| GET | `/api/admin/system/` | Oturum / rol |
| GET | `/api/admin/system/health` | Oturum / rol |
| POST | `/api/admin/system/restrictions` | Oturum / rol |
| DELETE | `/api/admin/system/restrictions/:id` | Oturum / rol |
| GET | `/api/admin/system/usage` | Oturum / rol |
| GET | `/api/admin/test-center` | Oturum / rol |
| GET | `/api/admin/users` | Oturum / rol |
| POST | `/api/admin/users` | Oturum / rol |
| DELETE | `/api/admin/users/:id` | Oturum / rol |
| PATCH | `/api/admin/users/:id/password` | Oturum / rol |
| PATCH | `/api/admin/users/:id/status` | Oturum / rol |
| POST | `/api/analytics/page` | Public veya kişisel capability |
| GET | `/api/answer-key-files/:id` | Public veya kişisel capability |
| GET | `/api/answer-keys` | Public veya kişisel capability |
| GET | `/api/answer-keys/:id` | Public veya kişisel capability |
| GET | `/api/answer-keys/:id/pdf` | Public veya kişisel capability |
| GET | `/api/answer-keys/:id/pdf-info` | Public veya kişisel capability |
| POST | `/api/answer-keys/:id/shares` | Public veya kişisel capability |
| POST | `/api/applications` | Public veya kişisel capability |
| GET | `/api/auth/human-verification` | Public veya kişisel capability |
| POST | `/api/auth/login` | Public veya kişisel capability |
| POST | `/api/auth/register` | Public veya kişisel capability |
| POST | `/api/auth/setup` | Public veya kişisel capability |
| GET | `/api/blog` | Public veya kişisel capability |
| GET | `/api/blog/:id` | Public veya kişisel capability |
| POST | `/api/contact` | Public veya kişisel capability |
| GET | `/api/dealer-policy` | Oturum / rol |
| GET | `/api/exam-schedule` | Public veya kişisel capability |
| GET | `/api/exam-schedule/:id` | Public veya kişisel capability |
| GET | `/api/exams` | Oturum / rol |
| POST | `/api/exams` | Oturum / rol |
| GET | `/api/health` | Public veya kişisel capability |
| GET | `/api/my-results` | Oturum / rol |
| GET | `/api/my-results/:id` | Oturum / rol |
| GET | `/api/my-results/:id/pdf` | Oturum / rol |
| POST | `/api/optical/convert/download` | Oturum / rol |
| POST | `/api/optical/convert/preview` | Oturum / rol |
| POST | `/api/optical/evaluate` | Oturum / rol |
| GET | `/api/optical/evaluation-exams` | Oturum / rol |
| GET | `/api/optical/evaluation-templates` | Oturum / rol |
| GET | `/api/optical/fmt-shares` | Oturum / rol |
| POST | `/api/optical/fmt-shares` | Oturum / rol |
| DELETE | `/api/optical/fmt-shares/:id` | Oturum / rol |
| POST | `/api/optical/infer-fmt` | Oturum / rol |
| GET | `/api/optical/keys` | Oturum / rol |
| POST | `/api/optical/keys` | Oturum / rol |
| GET | `/api/optical/keys/:id` | Oturum / rol |
| PATCH | `/api/optical/keys/:id` | Oturum / rol |
| POST | `/api/optical/preview` | Oturum / rol |
| GET | `/api/optical/publishers` | Oturum / rol |
| GET | `/api/optical/report-templates` | Oturum / rol |
| GET | `/api/optical/result-exams` | Oturum / rol |
| GET | `/api/optical/result-exams/:id` | Oturum / rol |
| GET | `/api/optical/result-exams/:id/access-codes` | Oturum / rol |
| GET | `/api/optical/result-exams/:id/edit` | Oturum / rol |
| POST | `/api/optical/result-exams/:id/edit` | Oturum / rol |
| POST | `/api/optical/result-exams/:id/edit-preview` | Oturum / rol |
| GET | `/api/optical/result-exams/:id/export` | Oturum / rol |
| GET | `/api/optical/results` | Oturum / rol |
| GET | `/api/optical/results/:id` | Oturum / rol |
| GET | `/api/optical/results/:id/analysis` | Oturum / rol |
| GET | `/api/optical/results/:id/checks` | Oturum / rol |
| POST | `/api/optical/results/:id/delete` | Oturum / rol |
| PATCH | `/api/optical/results/:id/publication` | Oturum / rol |
| POST | `/api/optical/results/:id/re-evaluate` | Oturum / rol |
| POST | `/api/optical/results/:id/re-evaluate/preview` | Oturum / rol |
| POST | `/api/optical/results/:id/restore` | Oturum / rol |
| GET | `/api/optical/score-profiles` | Oturum / rol |
| POST | `/api/optical/score-profiles` | Oturum / rol |
| POST | `/api/optical/suggest-exams` | Oturum / rol |
| GET | `/api/optical/templates` | Oturum / rol |
| POST | `/api/optical/templates` | Oturum / rol |
| PATCH | `/api/optical/templates/:id` | Oturum / rol |
| GET | `/api/optical/templates/:id/download` | Oturum / rol |
| GET | `/api/optical/templates/:id/layout` | Oturum / rol |
| GET | `/api/optical/templates/:id/shares` | Oturum / rol |
| POST | `/api/optical/templates/:id/shares` | Oturum / rol |
| POST | `/api/optical/templates/analyze` | Oturum / rol |
| POST | `/api/optical/templates/bulk` | Oturum / rol |
| POST | `/api/optical/templates/bulk-rows` | Oturum / rol |
| GET | `/api/optical/templates/examples/:code/download` | Oturum / rol |
| POST | `/api/optical/templates/preview` | Oturum / rol |
| GET | `/api/optical/txt-files` | Oturum / rol |
| POST | `/api/optical/txt-files` | Oturum / rol |
| DELETE | `/api/optical/txt-files/:id` | Oturum / rol |
| POST | `/api/public/file-shares/:id/download` | Public veya kişisel capability |
| POST | `/api/public/file-shares/:id/info` | Public veya kişisel capability |
| POST | `/api/public/fmt-shares/:id/download` | Public veya kişisel capability |
| GET | `/api/public/fmt-shares/:id/info` | Public veya kişisel capability |
| POST | `/api/public/fmt-shares/:id/view` | Public veya kişisel capability |
| POST | `/api/public/pdf-shares/:id/download` | Public veya kişisel capability |
| POST | `/api/public/pdf-shares/:id/view` | Public veya kişisel capability |
| GET | `/api/publisher-requests` | Oturum / rol |
| POST | `/api/publisher-requests` | Oturum / rol |
| GET | `/api/publishers` | Public veya kişisel capability |
| GET | `/api/publishers/:id/logo` | Public veya kişisel capability |
| GET | `/api/publishers/search` | Public veya kişisel capability |
| DELETE | `/api/reader-access/:id` | Oturum / rol |
| GET | `/api/reader-accounts` | Oturum / rol |
| POST | `/api/reader-accounts` | Oturum / rol |
| PATCH | `/api/reader-accounts/:id` | Oturum / rol |
| POST | `/api/reader-accounts/:id/access` | Oturum / rol |
| POST | `/api/reader-accounts/:id/invitation` | Oturum / rol |
| GET | `/api/schools` | Oturum / rol |
| POST | `/api/schools` | Oturum / rol |
| PATCH | `/api/schools/:id` | Oturum / rol |
| DELETE | `/api/security/devices/:id` | Oturum / rol |
| POST | `/api/security/logout` | Oturum / rol |
| POST | `/api/security/mfa/confirm` | Public veya kişisel capability |
| POST | `/api/security/mfa/enroll` | Oturum / rol |
| POST | `/api/security/mfa/login` | Public veya kişisel capability |
| POST | `/api/security/mfa/reset` | Oturum / rol |
| POST | `/api/security/mfa/setup` | Public veya kişisel capability |
| POST | `/api/security/mfa/step-up` | Oturum / rol |
| GET | `/api/security/sessions` | Oturum / rol |
| DELETE | `/api/security/sessions/:id` | Oturum / rol |
| GET | `/api/shares` | Public veya kişisel capability |
| PATCH | `/api/shares/:id` | Public veya kişisel capability |
| GET | `/classes` | Public veya kişisel capability |
| GET | `/grades` | Public veya kişisel capability |
| POST | `/lookup` | Public veya kişisel capability |
| POST | `/pdf` | Public veya kişisel capability |
| POST | `/resolve` | Public veya kişisel capability |
| GET | `/schools` | Public veya kişisel capability |
