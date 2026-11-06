-- Accounts whose email is never confirmed are deleted after 7 days, so abandoned
-- sign-ups don't pile up. Confirmed accounts are never touched. Their profile
-- goes with them (on delete cascade); unconfirmed users can't log in, so they
-- have no bookings or feedback.

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

create or replace function public.purge_unconfirmed_users()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  removed int;
begin
  delete from auth.users
  where email_confirmed_at is null
    and created_at < now() - interval '7 days';
  get diagnostics removed = row_count;
  return removed;
end
$$;

revoke execute on function public.purge_unconfirmed_users() from public, anon, authenticated;

-- Every day at 3:00 AM Manila time (19:00 UTC). Re-scheduling the same name replaces it.
select cron.schedule('purge-unconfirmed-users', '0 19 * * *', 'select public.purge_unconfirmed_users()');
