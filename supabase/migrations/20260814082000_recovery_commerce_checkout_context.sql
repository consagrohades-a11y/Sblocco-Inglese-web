alter table public.purchases
  add column utm_source text,
  add column utm_medium text,
  add column utm_campaign text,
  add column utm_content text,
  add column consent_version text,
  add column consent_recorded_at timestamptz;

alter table public.purchases
  add constraint purchases_utm_source_length check (utm_source is null or char_length(utm_source) <= 100),
  add constraint purchases_utm_medium_length check (utm_medium is null or char_length(utm_medium) <= 100),
  add constraint purchases_utm_campaign_length check (utm_campaign is null or char_length(utm_campaign) <= 100),
  add constraint purchases_utm_content_length check (utm_content is null or char_length(utm_content) <= 100),
  add constraint purchases_consent_version_length check (consent_version is null or char_length(consent_version) <= 80);

create or replace function public.record_stripe_checkout_context(
  p_checkout_session_id text,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_consent_version text default null,
  p_consent_recorded_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.purchases
  set
    utm_source = nullif(left(regexp_replace(coalesce(p_utm_source, ''), '[[:cntrl:]]', '', 'g'), 100), ''),
    utm_medium = nullif(left(regexp_replace(coalesce(p_utm_medium, ''), '[[:cntrl:]]', '', 'g'), 100), ''),
    utm_campaign = nullif(left(regexp_replace(coalesce(p_utm_campaign, ''), '[[:cntrl:]]', '', 'g'), 100), ''),
    utm_content = nullif(left(regexp_replace(coalesce(p_utm_content, ''), '[[:cntrl:]]', '', 'g'), 100), ''),
    consent_version = nullif(left(regexp_replace(coalesce(p_consent_version, ''), '[[:cntrl:]]', '', 'g'), 80), ''),
    consent_recorded_at = p_consent_recorded_at,
    updated_at = now()
  where stripe_checkout_session_id = p_checkout_session_id;
end;
$$;

revoke all on function public.record_stripe_checkout_context(text, text, text, text, text, text, timestamptz) from public;
revoke all on function public.record_stripe_checkout_context(text, text, text, text, text, text, timestamptz) from anon;
revoke all on function public.record_stripe_checkout_context(text, text, text, text, text, text, timestamptz) from authenticated;
grant execute on function public.record_stripe_checkout_context(text, text, text, text, text, text, timestamptz) to service_role;
