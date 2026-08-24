-- V10: SEED REFERENCE DATA
-- Back-office onboarding needs reference rows to exist before staff can be
-- provisioned (roles) or hotels created (currencies, countries) and before
-- cancellations carry a standard reason code.

INSERT INTO roles (name) VALUES
    ('super_admin'),
    ('hotel_admin'),
    ('revenue_manager'),
    ('reservation_agent'),
    ('reception_staff'),
    ('content_manager'),
    ('finance_staff')
ON CONFLICT (name) DO NOTHING;

INSERT INTO currencies (code, name, decimal_places) VALUES
    ('MAD', 'Moroccan Dirham', 2),
    ('USD', 'US Dollar', 2),
    ('EUR', 'Euro', 2),
    ('GBP', 'British Pound', 2),
    ('AED', 'UAE Dirham', 2),
    ('SAR', 'Saudi Riyal', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO countries (code, name) VALUES
    ('MA', 'Morocco'),
    ('US', 'United States'),
    ('FR', 'France'),
    ('GB', 'United Kingdom'),
    ('AE', 'United Arab Emirates'),
    ('SA', 'Saudi Arabia'),
    ('ES', 'Spain')
ON CONFLICT (code) DO NOTHING;

INSERT INTO cancellation_reasons (code, label) VALUES
    ('guest_changed_plans', 'Guest changed plans'),
    ('guest_found_cheaper', 'Guest found a better price'),
    ('guest_duplicate_booking', 'Duplicate booking'),
    ('property_issue', 'Issue with the property'),
    ('guest_no_show_policy', 'No-show policy applied')
ON CONFLICT (code) DO NOTHING;