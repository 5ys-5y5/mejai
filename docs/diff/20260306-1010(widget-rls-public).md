# Summary
- Added RLS select policy on B_chat_widgets to allow public read for is_public templates and admin/owner read for authenticated users.

# SQL
- create policy b_chat_widgets_select_public_or_admin on public."B_chat_widgets" for select using (is_public=true OR auth.role()='authenticated' AND created_by=auth.uid() OR admin via A_iam_user_access_maps)
