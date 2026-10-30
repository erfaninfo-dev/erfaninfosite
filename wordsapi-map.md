# wordsapi: endpoint map (extracted from source structure, no values)

Base: `https://erfaninfo.com/wordsapi/<file>.php`  |  JSON responses  |  Bearer-token auth (`auth_helpers.php`)

- Endpoint files: **75**, helper/config files: **16**
- Extracted automatically by pattern search. Treat parameter lists as hints, then confirm with a live GET and the source before relying on them.
- Role flags: `A` needs a token, `ADM` admin only, `T` teacher helpers, `S` student helpers.

## 1. Stories (admin_story*)

| File | Verbs | Role | Query | Body keys | Tables | Response keys |
|---|---|---|---|---|---|---|
| `admin_stories` | GET/OPTIONS | A ADM | id, mode | client_request_id, content_type, id, image_path, target_mode, target_user_ids, text_content, text_style, vi... | admin_stories, admin_story_grammar_games, admin_story_likes, admin_story_polls, admin_s... | duplicate, error, id, ok, stories |
| `admin_story_audience` | ? | A ADM | story_id |  | admin_stories, admin_story_poll_votes, admin_story_polls | error, id, like_count, likers, poll, story_id, text, view_count, viewers |
| `admin_story_grammar_answer` | GET/OPTIONS | A |  | game_id, option_id, story_id | admin_story_grammar_attempts, admin_story_grammar_games | error, grammar_game, ok, options |
| `admin_story_grammar_create` | ? | public? |  |  |  |  |
| `admin_story_like` | ? | A |  | liked, story_id | admin_story_likes, story | error, like_count, liked, ok |
| `admin_story_poll_vote` | ? | A |  | option_id, poll_id, story_id | admin_stories, admin_story_poll_votes, admin_story_polls | admin_user_id, already_voted, error, id, ok, options, poll, text_style |
| `admin_story_upload` | ? | A ADM |  |  |  | error, image_path, ok |
| `admin_story_view` | ? | A |  | story_id | admin_story_views | error, ok |

## 10. Other

| File | Verbs | Role | Query | Body keys | Tables | Response keys |
|---|---|---|---|---|---|---|
| `update_profile` | ? | A |  | avatar, bio, display_name | POST, failed, users | error, user |
| `upload_avatar` | ? | A |  |  | failed, users | error, user |
| `user_vocab_marks` | GET/OPTIONS | A | kind, word_id | kind, word_id | table, words | error, ok, word_ids |
| `vocab_quiz_result_detail` | ? | A | id |  | books, vocab_quiz_results | book_id, book_title, created_at, error, id, result, score, session, total_questions, us... |
| `vocab_quiz_results_my` | ? | A | book_id, limit |  | books, vocab_quiz_results | attempts, book_id, book_title, correct, created_at, error, id, quiz_name, results, summ... |
| `vocab_quiz_results_submit` | ? | A |  | book_id, score, session, total_questions | books, vocab_quiz_results | error, id, ok |
| `vocab_quiz_wrongs` | GET | A | book_id, unit, word_key | book_id, unit, word_key | vocab_quiz_wrongs | error, items, ok, unit, word_key |
| `word_builder_league_progress` | ? | A |  | advanced_stages_cleared, beginner_stages_cleared, coins, intermediate_stages_cleared | word_builder_league_progress | error, ok |
| `word_important` | GET/OPTIONS | public? |  | id, important | failed, words | id, important, ok |
| `words` | ? | public? | book_id, global, section, unit |  | words | book_id, example_en, example_fa, example_kur, id, important, meaning_en, meaning_fa, me... |

## 2. Admin: users and topics

| File | Verbs | Role | Query | Body keys | Tables | Response keys |
|---|---|---|---|---|---|---|
| `admin_grammar_topic_new` | GET | A |  | is_new, topic | grammar_topic_new_overrides | error, is_new, ok, topic |
| `admin_user_student` | ? | A |  | is_teacher, student_access, teacher_user_id, user_id | failed, users | display_name, email, error, id, is_admin, is_teacher, student_access, teacher_name, tea... |
| `admin_users` | ? | A | limit, offset, q | active_app_version | users | display_name, email, error, id, is_admin, is_teacher, student_access, teacher_name, tea... |

## 3. Auth and account

| File | Verbs | Role | Query | Body keys | Tables | Response keys |
|---|---|---|---|---|---|---|
| `change_password` | ? | A |  | current_password, new_password | the, user_tokens, users | error, error_code, ok |
| `login` | ? | A |  | email, password | users | error, token, user |
| `logout` | ? | A |  |  | user_tokens | error, ok |
| `me` | ? | A |  |  |  | error, user |
| `password_reset_confirm` | ? | A |  | code, email, new_password | password_resets, user_tokens, users | code, error, msg, ok, user_id |
| `password_reset_request` | ? | A |  | email | password_resets, users | code, email, error, msg, ok, sent, user_id |
| `register` | ? | A S |  | display_name, email, is_student, password, student_code | users | error, token, user |
| `student_redeem_code` | ? | A S |  | code | users | error, ok, user |

## 4. Grammar

| File | Verbs | Role | Query | Body keys | Tables | Response keys |
|---|---|---|---|---|---|---|
| `grammar_books` | ? | public? |  |  | grammar_books, grammar_units, questions, the | created_at, description, id, is_active, level, question_count, sort_order, title, unit_... |
| `grammar_questions` | ? | public? | topic, topic_id, unit_id |  | INFORMATION_SCHEMACOLUMNS, grammar_questions, grammar_topics, questions | correct_answer, eng_explanation, fa_explanation, grammar_book_id, grammar_unit_id, id, ... |
| `grammar_report_question` | ? | public? |  |  |  |  |
| `grammar_result_detail` | ? | A T | id |  | results, users | avatar, created_at, error, id, public, quiz_name, result, score, selected_grammars, ses... |
| `grammar_result_reactions` | GET/OPTIONS | A | result_ids | emoji, result_id | grammar_result_reactions, results | counts, my_emoji, ok, reactions, result_id |
| `grammar_results_my` | ? | A | order, sort |  | results, users | avatar, created_at, error, id, public, quiz_name, results, score, selected_grammars, to... |
| `grammar_results_public` | ? | A | limit, offset, order, sort |  | ranked, results, users | avatar, bio, created_at, error, has_more, id, public, quiz_name, results, score, select... |
| `grammar_results_submit` | ? | A |  | public, quiz_name, score, selected_grammars, session, total_questions | results | error, id, ok |
| `grammar_topic_pdfs` | ? | public? |  |  | INFORMATION_SCHEMACOLUMNS, grammar_topic_pdfs | id, pdf_url, pdf_url_kur, sort_order, title, topic, updated_at |
| `grammar_topics` | ? | public? |  |  | INFORMATION_SCHEMACOLUMNS, grammar_questions, grammar_topic_new_overrides, grammar_topi... | is_new, question_count, topic, topic_created_at |
| `grammar_unit_texts` | ? | public? | unit_id |  | grammar_unit_texts | created_at, grammar_unit_id, id, is_active, sort_order, text_en_fa, text_en_kur, title |
| `grammar_units` | ? | public? | book_id |  | grammar_unit_texts, grammar_units, questions | created_at, grammar_book_id, id, is_active, question_count, sort_order, subtitle, text_... |
| `legacy_grammar_result_link` | ? | A |  | avatar, confirm, display_name, email, legacy_name | existing, grammar, legacy_grammar_result_links, results, users | created_at, display_name, email, error, id, legacy_name, matched_result_count, ok, prev... |
| `legacy_grammar_unlinked` | ? | A | limit, offset, q |  | results | error, has_more, items, latest_at, legacy_name, result_count |
| `sections` | ? | public? | book_id, unit |  | unit_samples, words | section, section_details |
| `unit_samples` | ? | public? | book_id, section, unit |  | unit_samples |  |
| `units` | ? | public? | book_id |  | unit_samples, words | unit, unit_details |

## 5. Books, vocabulary, app meta

| File | Verbs | Role | Query | Body keys | Tables | Response keys |
|---|---|---|---|---|---|---|
| `api_log` | ? | public? |  |  |  |  |
| `app_update` | GET/OPTIONS | A | installed_version, platform |  | MySQL, app_updates, check, info | android_force_update, android_version_code, android_version_name, apk_url, en, fa, forc... |
| `book_pdfs` | ? | public? |  |  | INFORMATION_SCHEMACOLUMNS, book_pdfs | book_id, id, pdf_url, sort_order, title, updated_at |
| `books` | ? | A | scope, search |  | INFORMATION_SCHEMACOLUMNS, book_series, books | description, id, sort_order, title |
| `game_word_categories` | ? | public? |  |  | game_category_words, game_word_categories | example_en, example_fa, example_kur, icon, id, meaning_en, meaning_fa, meaning_kur, nam... |

## 6. Speaking

| File | Verbs | Role | Query | Body keys | Tables | Response keys |
|---|---|---|---|---|---|---|
| `speaking_model_questions` | ? | public? | part |  | speaking_model_questions, speaking_questions, speaking_topics | formula, id, model_number, part, question_count, template, title |
| `speaking_questions` | ? | public? | model_id, topic_id |  | speaking_band_answers, speaking_model_questions, speaking_questions, speaking_topics | answer, band, fa_answer, formula, id, kur_answer, model, model_id, model_number, questi... |
| `speaking_topic_ideas` | ? | public? | topic_id |  | speaking_topic_ideas, speaking_topics | activities, advantage, band_text, categories, category, disadvantage, example, examples... |
| `speaking_topic_ideas_search` | ? | public? | part, q, topic_id |  | speaking_topic_ideas, speaking_topics | band_text, category, category_title_en, example, id, is_current_topic, like, part, phra... |
| `speaking_topics` | ? | public? | part |  | speaking_questions, speaking_topics | id, part, question_count, sort_order, title |

## 7. League and PvP challenges

| File | Verbs | Role | Query | Body keys | Tables | Response keys |
|---|---|---|---|---|---|---|
| `league` | ? | A | limit, offset, period, sort, type |  | admin_stories, admin_story_grammar_attempts, admin_story_grammar_games, league_activity... | accuracy, active_challenges, active_days, answered_count, avatar, badge, bio, completed... |
| `league_event` | ? | A |  | answered_count, client_request_id, event_type, source_id, source_type | league_activity_events, league_seasons | capped, duplicate, ends_at, error, id, ok, points, season_type, starts_at, status, title |
| `pvp_challenges` | GET | A | match_id, status | action, match_id, opponent_id | pvp_match_players, pvp_matches, users | completed_recent, error, expected_path, hint, incoming_pending, match, match_id, my_tur... |

## 8. AI chat

| File | Verbs | Role | Query | Body keys | Tables | Response keys |
|---|---|---|---|---|---|---|
| `ai_chat` | ? | A | quota | client_request_id, message | secretsphpexample | duplicate, error, limit, remaining, reply, used |

## 9. Teacher, classes, schedule, finance

| File | Verbs | Role | Query | Body keys | Tables | Response keys |
|---|---|---|---|---|---|---|
| `my_class_schedule` | ? | A |  |  | teacher_class_schedule_slots | end_time, error, id, label, slots, start_time, weekday |
| `my_class_sessions` | ? | A |  |  |  | error, session_count, sessions |
| `session_recorded_at` | ? | public? |  |  |  |  |
| `teacher_class_groups` | ? | A | group_id | add_group_session, add_member, create_group, delete_group_id, group_id, name, note, recorded_at, remove_mem... | teacher_class_group_members, teacher_class_groups | added_count, error, group, groups, ok, results |
| `teacher_financial_summary` | ? | A T | from, group_by, payment_status, period, student_id, to |  |  | error, from, group_by, ok, payment_status, period, student_id, to |
| `teacher_schedule_attendance` | ? | A T |  | did_happen, mode, occurrence_id, occurrences, process_due, resolve_occurrence, set_mode, student_id | mode, session_count, teacher_class_session_entries, teacher_schedule_attendance_occurre... | auto_enabled_at, avatar, end_at, error, id, label, mode, pending, policies, source_id, ... |
| `teacher_student_codes` | ? | A T S |  | code | student_codes | code, codes, error, ok |
| `teacher_student_grammar_results` | ? | A T | student_id |  | results, users | avatar, created_at, error, id, public, quiz_name, results, score, selected_grammars, to... |
| `teacher_student_messages` | ? | A T | limit, peer_teacher_id, preview, student_id, student_peers, summary | body, edit, mark_read, message_id, peer_teacher_id, saved_messages, story_id, story_reply, student_id | GET, admin_stories, teacher_student_messages, users | body, created_at, display_name, edited_at, error, id, is_teacher, last_message, last_me... |
| `teacher_student_pricing` | ? | A T | student_id | currency_code, default_term_fee, session_price, student_id |  | error, ok |
| `teacher_student_schedule` | ? | A T | student_id | add_schedule_slot, delete_schedule_slot_id, end_time, label, slot_id, start_time, student_id, update_schedu... | teacher_class_schedule_slots | end_time, error, id, label, slots, start_time, weekday |
| `teacher_student_sessions` | ? | A | student_id | add_session, add_term, delete_session_id, delete_term_id, is_paid, note, note_only, recorded_at, session_ca... | note, session_count, teacher_class_session_entries, teacher_student_sessions, teacher_s... | class_groups, error, note, ok, personal, session_count, sessions, updated_at |
| `teacher_student_vocab_results` | ? | A T | limit, student_id |  | books, vocab_quiz_results | book_id, book_title, correct, created_at, error, id, quiz_name, results, units, wrong |
| `teacher_students` | ? | A T | inbox |  | teacher_student_messages, teacher_student_sessions, users | avatar, display_name, email, error, id, note, session_count, sessions_updated_at, students |
| `teacher_temporary_schedule` | ? | A T |  | add_temporary_slot, delete_temporary_slot_id, duration_minutes, label, slot_id, start_at, student_id, updat... | teacher_class_temporary_schedule_slots, users | avatar, end_at, error, id, label, slots, start_at, student_display_label, student_email... |

## Helper and config files (not endpoints)

- `admin_helpers.php` (412 B)
- `admin_story_helpers.php` (23618 B)
- `ai_chat_helpers.php` (13614 B)
- `auth_helpers.php` (5760 B)
- `config.php` (2979 B)
- `email_helpers.php` (1061 B)
- `grammar_topic_api_helpers.php` (3698 B)
- `pvp_challenge_helpers.php` (20517 B)
- `secrets.php` (623 B)
- `speaking_topic_ideas_helpers.php` (1089 B)
- `student_helpers.php` (5382 B)
- `teacher_class_groups_api_helpers.php` (11506 B)
- `teacher_financial_api_helpers.php` (23437 B)
- `teacher_helpers.php` (2095 B)
- `teacher_student_session_api_helpers.php` (11046 B)
- `user_app_version_helpers.php` (3224 B)

## Database tables referenced (count of files using each)

- `users` (30)
- `results` (9)
- `admin_stories` (6)
- `INFORMATION_SCHEMACOLUMNS` (6)
- `books` (5)
- `questions` (5)
- `vocab_quiz_results` (5)
- `words` (5)
- `speaking_topics` (5)
- `teacher_class_session_entries` (5)
- `admin_story_grammar_games` (4)
- `admin_story_polls` (4)
- `failed` (4)
- `user_tokens` (4)
- `teacher_student_sessions` (4)
- `teacher_student_terms` (4)
- `admin_story_views` (3)
- `admin_story_poll_votes` (3)
- `admin_story_grammar_attempts` (3)
- `grammar_questions` (3)
- `grammar_topics` (3)
- `unit_samples` (3)
- `speaking_questions` (3)
- `session_count` (3)
- `grammar_topic_new_overrides` (2)
- `auth_user_from_token` (2)
- `admin_story_likes` (2)
- `admin_story_targets` (2)
- `table` (2)
- `app_updates` (2)
- `the` (2)
- `game_category_words` (2)
- `game_word_categories` (2)
- `grammar_units` (2)
- `grammar_unit_texts` (2)
- `league_activity_events` (2)
- `league_seasons` (2)
- `word_builder_league_progress` (2)
- `teacher_class_schedule_slots` (2)
- `password_resets` (2)
- `pvp_match_players` (2)
- `pvp_matches` (2)
- `speaking_model_questions` (2)
- `speaking_topic_ideas` (2)
- `student_codes` (2)
- `teacher_class_group_members` (2)
- `teacher_class_groups` (2)
- `teacher_student_messages` (2)
- `story` (1)
- `secretsphpexample` (1)
- `ai_chat_messages` (1)
- `ai_chat_usage` (1)
- `MySQL` (1)
- `check` (1)
- `info` (1)
- `Authorization` (1)
- `book_pdfs` (1)
- `book_series` (1)
- `your` (1)
- `grammar_books` (1)
- `grammar_result_reactions` (1)
- `ranked` (1)
- `grammar_topic_pdfs` (1)
- `reported_questions` (1)
- `existing` (1)
- `grammar` (1)
- `legacy_grammar_result_links` (1)
- `speaking_band_answers` (1)
- `and` (1)
- `paid` (1)
- `session_price` (1)
- `teacher_student_pricing` (1)
- `mode` (1)
- `teacher_schedule_attendance_occurrences` (1)
- `teacher_schedule_attendance_settings` (1)
- `GET` (1)
- `note` (1)
- `teacher_class_temporary_schedule_slots` (1)
- `POST` (1)
- `vocab_quiz_wrongs` (1)

---

# Live response shapes of the public (no token) endpoints

Verified with plain GET requests on 2026-10-30. Only structure is recorded, not content.
Languages in the data: `en`, `fa`, `ckb` (also named `kur` / `ku` in some fields).

| Endpoint | Params | Returns |
|---|---|---|
| `books.php` | none | array (33): `id, title, description, sort_order, is_public, is_student, track, series_id, volume_order, series_title, series_sort_order` |
| `units.php` | `book_id` | array (14 for book 1): `unit, unit_details` |
| `words.php` | `book_id` | array (1888 for one book): `id, book_id, unit, section, section_details, word, type, important, meaning_en, meaning_fa, meaning_kur, example_en, example_fa, example_kur` |
| `sections.php`, `unit_samples.php` | `book_id` | 400 for the first book tried; need a book that has them |
| `book_pdfs.php` | none | array (2): `id, book_id, title, pdf_url, sort_order, updated_at` |
| `grammar_books.php` | none | array (3): `id, title, level, description, sort_order, is_active, created_at, unit_count, question_count` |
| `grammar_units.php` | `book_id` (grammar book) | array (10): `id, grammar_book_id, unit_number, title, subtitle, sort_order, is_active, created_at, text_count, question_count` |
| `grammar_unit_texts.php` | `unit_id` | grammar reading text for a unit |
| `grammar_topics.php` | none | array (60): `topic, question_count, topic_created_at, is_new, topic_id` |
| `grammar_questions.php` | `topic` or `topic_id` or `unit_id` | array (300 for one topic): `id, topic, question_text, option1..option4, correct_answer, order_num, fa_explanation, kur_explanation, eng_explanation, grammar_book_id, grammar_unit_id` |
| `grammar_topic_pdfs.php` | none | array (67): `id, topic, title, pdf_url, pdf_url_kur, sort_order, updated_at` |
| `speaking_topics.php` | none | array (135): `id, title, question_count, sort_order` |
| `speaking_model_questions.php` | none | array (169): `id, model_number, title, formula, template, question_count` |
| `speaking_questions.php` | `topic_id` or `model_id` | `{topic:{id,title}, questions:[{id,question_text,answer,fa_answer,kur_answer,sort_order,topic,model,band_answers}]}` |
| `speaking_topic_ideas.php` | `topic_id` | `{topic:{id,title}, categories:[{category,title_en,ideas}]}` |
| `game_word_categories.php` | none | array (51), about 400 KB: `id, slug, name_en, name_fa, name_ckb, icon, sort_order, words:[{word, meaning_en/fa/kur, example_en/fa/kur}]` (about 100 words each) |
| `app_update.php` | none | `android_version_code/name, apk_url, android_force_update, windows_version_code/name, windows_url, windows_force_update, force_update, release_notes:{en,fa,ku}` |

Errors are JSON: `{"error": "<message>"}` with 400 (missing param), 401 (`Missing token`), 405 (`Only POST is allowed`).

# Auth model (from source structure)

- `login.php` (POST) issues a token; `me.php` needs `Authorization: Bearer <token>` (`Missing token` otherwise).
- Roles seen in helpers: student, teacher, admin (`admin_require_user`, `teacher_helpers`, `student_helpers`).
- Registration, password reset, and student redeem codes exist (`register`, `password_reset_*`, `student_redeem_code`).

# What is clearly public content (good first phase for the web)

Vocabulary books and words, grammar books/units/topics/questions with explanations in 3 languages, speaking topics/models/questions/ideas, word game categories, PDFs, app update info.

# What needs a login (later phases)

Grammar results and reactions, league and PvP challenges, AI chat, stories, teacher classes/schedule/attendance/finance, student-teacher messages, user vocab marks, admin screens.

# Security findings on the host (not part of the API itself)

Publicly downloadable right now (HEAD checked, not downloaded): `/wordsapi/config.zip` (105 KB), `/wordsapi.zip` (3.5 MB), `/wordsapi/teacher_financial_api_helpers.zip` (7 KB), `/wordsapi/.gitignore`. If any of them contain `config.php` or `secrets.php`, database credentials may be exposed. `/wordsapi/error_log` correctly returns 403.
