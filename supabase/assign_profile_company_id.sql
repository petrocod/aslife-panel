-- Örnek: Oturum açtığınız kullanıcıya şirket bağlayın
-- 1) companies tablosundan bir id seçin veya yeni şirket ekleyin
-- 2) auth.users.id = profiles.id eşleşir; email ile bulabilirsiniz

-- Mevcut şirket id'lerini listele:
-- SELECT id, name FROM companies;

-- E-postaya göre profili güncelle (e-postayı kendi hesabınızla değiştirin):
-- UPDATE profiles
-- SET company_id = 'BURAYA-companies.id-UUID'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'sizin@email.com' LIMIT 1);
