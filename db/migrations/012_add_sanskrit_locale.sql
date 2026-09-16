alter table puja_translations drop constraint if exists puja_translations_locale_check;
alter table puja_translations add constraint puja_translations_locale_check check(locale in('hi-IN','od-IN','sa-IN'));
alter table ui_translations drop constraint if exists ui_translations_locale_check;
alter table ui_translations add constraint ui_translations_locale_check check(locale in('hi-IN','od-IN','sa-IN'));
