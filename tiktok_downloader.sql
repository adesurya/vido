-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.0.30 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.1.0.6537
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for tiktok_downloader
CREATE DATABASE IF NOT EXISTS `tiktok_downloader` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `tiktok_downloader`;

-- Dumping structure for table tiktok_downloader.bulk_sessions
CREATE TABLE IF NOT EXISTS `bulk_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` varchar(50) NOT NULL,
  `user_id` int NOT NULL,
  `total_videos` int NOT NULL,
  `processed_videos` int DEFAULT '0',
  `successful_downloads` int DEFAULT '0',
  `failed_downloads` int DEFAULT '0',
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_id` (`batch_id`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `bulk_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table tiktok_downloader.bulk_sessions: ~0 rows (approximately)
DELETE FROM `bulk_sessions`;

-- Dumping structure for table tiktok_downloader.download_history
CREATE TABLE IF NOT EXISTS `download_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `video_id` int NOT NULL,
  `download_type` enum('single','bulk') DEFAULT 'single',
  `batch_id` varchar(50) DEFAULT NULL,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `error_message` text,
  `downloaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `video_id` (`video_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_status` (`status`),
  KEY `idx_download_history_downloaded_at` (`downloaded_at`),
  CONSTRAINT `download_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `download_history_ibfk_2` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table tiktok_downloader.download_history: ~2 rows (approximately)
DELETE FROM `download_history`;
INSERT INTO `download_history` (`id`, `user_id`, `video_id`, `download_type`, `batch_id`, `status`, `error_message`, `downloaded_at`) VALUES
	(5, 2, 4, 'single', NULL, 'completed', NULL, '2025-05-25 15:16:22'),
	(6, 2, 5, 'single', NULL, 'completed', NULL, '2025-05-25 15:59:59');

-- Dumping structure for table tiktok_downloader.rate_limits
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `endpoint` varchar(100) NOT NULL,
  `requests_count` int DEFAULT '1',
  `window_start` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_endpoint` (`user_id`,`endpoint`),
  KEY `idx_window_start` (`window_start`),
  CONSTRAINT `rate_limits_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table tiktok_downloader.rate_limits: ~2 rows (approximately)
DELETE FROM `rate_limits`;
INSERT INTO `rate_limits` (`id`, `user_id`, `endpoint`, `requests_count`, `window_start`) VALUES
	(21, 2, 'tiktok_api', 1, '2025-05-25 15:59:58'),
	(22, 2, 'download', 1, '2025-05-25 15:59:58');

-- Dumping structure for table tiktok_downloader.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table tiktok_downloader.users: ~1 rows (approximately)
DELETE FROM `users`;
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `role`, `created_at`, `updated_at`, `is_active`) VALUES
	(2, 'admin', 'admin@tiktokdownloader.com', '$2b$10$v4Qb.MILkx3E8XypSmhNne10rHKOGOsOEtxeUtN8PKl9Te0cQqd5u', 'admin', '2025-05-25 13:24:44', '2025-05-25 13:24:44', 1);

-- Dumping structure for table tiktok_downloader.videos
CREATE TABLE IF NOT EXISTS `videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `aweme_id` varchar(100) NOT NULL,
  `tiktok_id` varchar(50) NOT NULL,
  `title` text,
  `cover_url` text,
  `video_url` text,
  `watermark_video_url` text,
  `duration` int DEFAULT NULL,
  `play_count` bigint DEFAULT '0',
  `digg_count` bigint DEFAULT '0',
  `comment_count` bigint DEFAULT '0',
  `share_count` bigint DEFAULT '0',
  `download_count` bigint DEFAULT '0',
  `collect_count` bigint DEFAULT '0',
  `author_id` varchar(50) DEFAULT NULL,
  `author_name` varchar(100) DEFAULT NULL,
  `author_avatar` text,
  `music_id` varchar(50) DEFAULT NULL,
  `music_title` varchar(255) DEFAULT NULL,
  `music_author` varchar(100) DEFAULT NULL,
  `file_size` bigint DEFAULT NULL,
  `watermark_file_size` bigint DEFAULT NULL,
  `region` varchar(10) DEFAULT NULL,
  `create_time` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aweme_id` (`aweme_id`),
  KEY `idx_videos_aweme_id` (`aweme_id`),
  KEY `idx_videos_tiktok_id` (`tiktok_id`),
  KEY `idx_videos_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table tiktok_downloader.videos: ~2 rows (approximately)
DELETE FROM `videos`;
INSERT INTO `videos` (`id`, `aweme_id`, `tiktok_id`, `title`, `cover_url`, `video_url`, `watermark_video_url`, `duration`, `play_count`, `digg_count`, `comment_count`, `share_count`, `download_count`, `collect_count`, `author_id`, `author_name`, `author_avatar`, `music_id`, `music_title`, `music_author`, `file_size`, `watermark_file_size`, `region`, `create_time`, `created_at`, `updated_at`) VALUES
	(4, 'v09044g40000d06r85fog65ogf7c7nn0', '7497846998557560070', 'pas bgt dijadiin makanan sharing bareng keluarga🤩 #jelajahbegah #jelajahbegah5 #jelajahkuliner #promo #dominospizza #jelajahgajian #diskon #jajanmurah ', 'https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/ocRJsaCIP2aAiAci1BB00QUJ0AiANAt0EjACE~tplv-tiktokx-cropcenter:300:400.jpeg?dr=14579&refresh_token=dc95c52d&x-expires=1748271600&x-signature=MY%2FMYHPEfb0NUwOL1nHnxS5nUHU%3D&t=4d5b0474&ps=13740610&shp=d05b14bd&shcp=34ff8df6&idc=maliva&s=AWEME_DETAIL', 'https://v16m-default.tiktokcdn.com/e09e4507083b5b2bf4919ffc08c9daf4/683388b5/video/tos/useast2a/tos-useast2a-ve-0068c004/oYcBkIKEB7wotAt3oifCA6Q4Dig8C0gCE4uI4N/?a=0&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&ch=0&cr=0&dr=0&er=0&lr=all&net=0&cd=0%7C0%7C0%7C0&cv=1&br=2866&bt=1433&cs=0&ds=6&ft=EeF4ntZWD0hQ12NvcPE-WIxRlfI8Eq_45SY&mime_type=video_mp4&qs=0&rc=aDo6ZTxlMzg0Z2Q1NzlpNUBpM3FmaXI5cjh1MzMzNzczM0AzYy1gYWMzXjAxYF41NjRgYSNrNDRkMmRjNTNhLS1kMTZzcw%3D%3D&vvpl=1&l=20250525231621200BFA4373C14CD64C6B&btag=e000b8000', 'https://v16m-default.tiktokcdn.com/e09e4507083b5b2bf4919ffc08c9daf4/683388b5/video/tos/useast2a/tos-useast2a-ve-0068c004/oYcBkIKEB7wotAt3oifCA6Q4Dig8C0gCE4uI4N/?a=0&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&ch=0&cr=0&dr=0&er=0&lr=all&net=0&cd=0%7C0%7C0%7C0&cv=1&br=2866&bt=1433&cs=0&ds=6&ft=EeF4ntZWD0hQ12NvcPE-WIxRlfI8Eq_45SY&mime_type=video_mp4&qs=0&rc=aDo6ZTxlMzg0Z2Q1NzlpNUBpM3FmaXI5cjh1MzMzNzczM0AzYy1gYWMzXjAxYF41NjRgYSNrNDRkMmRjNTNhLS1kMTZzcw%3D%3D&vvpl=1&l=20250525231621200BFA4373C14CD64C6B&btag=e000b8000', 16, 658, 48, 0, 0, 0, 1, '6772574422114960385', 'riri⋆.ೃ࿔*:･', 'https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/07bdbc3654c14475900152223a3e7520~tplv-tiktokx-cropcenter:300:300.jpeg?dr=14577&refresh_token=e9449e95&x-expires=1748271600&x-signature=5t4Kv9drcfxJRe53cSiAsGv%2BKzs%3D&t=4d5b0474&ps=13740610&shp=45126217&shcp=d05b14bd&idc=maliva', '7360029845722876677', 'original sound - starc_creature', 'wonwoo~', 3022065, 0, 'ID', 1745728550, '2025-05-25 15:16:22', '2025-05-25 15:16:22'),
	(5, 'v09044g40000cqgtnqfog65rv86cc1rg', '7395434080076107014', 'Anak ku ga pernah se excited ini loh sampai dia ketemu sepeda Clarion BMX✨🔥 #sepedaanak #sepedaanakmurah #anaksehat #TikTokShop #CapCut ', 'https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/oEzz3dOeDIWC3h3vAGFDJSRpBBfLmwBEEdQgEo~tplv-tiktokx-dmt-logoccm:300:400:tos-useast2a-v-0068/owrvZSCCAEHIiciqEQEiLvAIhpsAIA4EBBU3y.jpeg?dr=14578&refresh_token=d6734092&x-expires=1748271600&x-signature=oqesXKqOjP2QVqACrIDa3I%2F%2Bw8s%3D&t=4d5b0474&ps=13740610&shp=d05b14bd&shcp=34ff8df6&idc=maliva&s=AWEME_DETAIL', 'https://v16m-default.tiktokcdn.com/be225c127ce021742e61129091c77724/683392f9/video/tos/useast2a/tos-useast2a-ve-0068c003/ogEGI3F5CgJp1BWhBQDAEvo3RemQ3BuEJdEzfk/?a=0&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&ch=0&cr=0&dr=0&er=0&lr=all&net=0&cd=0%7C0%7C0%7C0&cv=1&br=5424&bt=2712&cs=0&ds=6&ft=EeF4ntZWD0hQ12Nvb9E-WIxRnDc8Eq_45SY&mime_type=video_mp4&qs=0&rc=NjhlZmhkNzc6ODM6OThnZUBpajRmO3U5cnR3dDMzNzczM0AtLi02YDE1NWExNjUzNDJhYSNvYDNzMmRja2RgLS1kMTZzcw%3D%3D&vvpl=1&l=20250525235958FBAD33EA9BA6D2626955&btag=e000b8000', 'https://v16m-default.tiktokcdn.com/a4de5b34efb7f7354faa41e3d5815a70/683392f9/video/tos/maliva/tos-maliva-ve-0068c801-us/o8JBoHBAedmDp93LgUSRGpfvEDBFh3EmQQuIM9/?a=0&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&ch=0&cr=0&dr=0&er=0&lr=all&net=0&cd=0%7C0%7C0%7C0&cv=1&br=6088&bt=3044&cs=0&ds=3&ft=EeF4ntZWD0hQ12Nvb9E-WIxRnDc8Eq_45SY&mime_type=video_mp4&qs=0&rc=NGY6ZTg7ODZpOjRnZjtoZkBpajRmO3U5cnR3dDMzNzczM0A0YTI1NTUtX2AxYGMzLTQvYSNvYDNzMmRja2RgLS1kMTZzcw%3D%3D&vvpl=1&l=20250525235958FBAD33EA9BA6D2626955&btag=e000b8000', 27, 45028, 78, 52, 69, 1, 46, '7143928022826402818', 'Mama 2M', 'https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/d1427307c957333219a718b2c2b05b7e~tplv-tiktokx-cropcenter:300:300.jpeg?dr=14577&refresh_token=ce1007fa&x-expires=1748271600&x-signature=%2FDssymjkXnfCv98ji%2F6uC8x5Bf0%3D&t=4d5b0474&ps=13740610&shp=45126217&shcp=d05b14bd&idc=maliva', '7395270382746601488', 'WARGA +62', 'Adilson Batista Da Silva', 9482231, 10640603, 'ID', 1721883684, '2025-05-25 15:59:59', '2025-05-25 15:59:59');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
