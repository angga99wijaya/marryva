CREATE OR REPLACE FUNCTION public.create_profile_on_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  requested_role text;
BEGIN
  requested_role := new.raw_user_meta_data ->> 'role';

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      new.email
    ),
    CASE
      WHEN requested_role IN ('couple', 'vendor', 'admin')
        THEN requested_role::public.user_role
      ELSE 'couple'::public.user_role
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$function$;
