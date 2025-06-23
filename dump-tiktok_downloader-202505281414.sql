-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: tiktok_downloader
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bulk_sessions`
--

DROP TABLE IF EXISTS `bulk_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bulk_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` varchar(50) NOT NULL,
  `user_id` int NOT NULL,
  `total_videos` int NOT NULL,
  `processed_videos` int DEFAULT '0',
  `successful_downloads` int DEFAULT '0',
  `failed_downloads` int DEFAULT '0',
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_id` (`batch_id`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `bulk_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bulk_sessions`
--

LOCK TABLES `bulk_sessions` WRITE;
/*!40000 ALTER TABLE `bulk_sessions` DISABLE KEYS */;
INSERT INTO `bulk_sessions` VALUES (8,'52152c37-10bf-4114-9e52-4b1f0dc3746b',2,2,2,2,0,'completed','2025-05-28 06:52:12','2025-05-28 13:52:14');
/*!40000 ALTER TABLE `bulk_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `download_history`
--

DROP TABLE IF EXISTS `download_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `download_history` (
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
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `download_history`
--

LOCK TABLES `download_history` WRITE;
/*!40000 ALTER TABLE `download_history` DISABLE KEYS */;
INSERT INTO `download_history` VALUES (37,2,22,'single',NULL,'completed',NULL,'2025-05-28 06:52:04'),(38,2,23,'single',NULL,'completed',NULL,'2025-05-28 06:52:13'),(39,2,23,'bulk','52152c37-10bf-4114-9e52-4b1f0dc3746b','completed',NULL,'2025-05-28 06:52:13'),(40,2,24,'single',NULL,'completed',NULL,'2025-05-28 06:52:14'),(41,2,24,'bulk','52152c37-10bf-4114-9e52-4b1f0dc3746b','completed',NULL,'2025-05-28 06:52:14');
/*!40000 ALTER TABLE `download_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rate_limits`
--

DROP TABLE IF EXISTS `rate_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rate_limits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `endpoint` varchar(100) NOT NULL,
  `requests_count` int DEFAULT '1',
  `window_start` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_endpoint` (`user_id`,`endpoint`),
  KEY `idx_window_start` (`window_start`),
  CONSTRAINT `rate_limits_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rate_limits`
--

LOCK TABLES `rate_limits` WRITE;
/*!40000 ALTER TABLE `rate_limits` DISABLE KEYS */;
INSERT INTO `rate_limits` VALUES (27,2,'tiktok_api',1,'2025-05-28 06:52:03'),(28,2,'download',1,'2025-05-28 06:52:03');
/*!40000 ALTER TABLE `rate_limits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'admin','admin@tiktokdownloader.com','$2b$10$v4Qb.MILkx3E8XypSmhNne10rHKOGOsOEtxeUtN8PKl9Te0cQqd5u','admin','2025-05-25 13:24:44','2025-05-25 13:24:44',1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `videos`
--

DROP TABLE IF EXISTS `videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `videos` (
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
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `videos`
--

LOCK TABLES `videos` WRITE;
/*!40000 ALTER TABLE `videos` DISABLE KEYS */;
INSERT INTO `videos` VALUES (22,'v09044g40000d06r85fog65ogf7c7nn0','7497846998557560070','pas bgt dijadiin makanan sharing bareng keluarga🤩 #jelajahbegah #jelajahbegah5 #jelajahkuliner #promo #dominospizza #jelajahgajian #diskon #jajanmurah ','https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/ocRJsaCIP2aAiAci1BB00QUJ0AiANAt0EjACE~tplv-tiktokx-cropcenter:300:400.jpeg?dr=14579&refresh_token=c8404135&x-expires=1748498400&x-signature=LxwOgLF1NQkWWtIsxxQH1CmXNek%3D&t=4d5b0474&ps=13740610&shp=d05b14bd&shcp=34ff8df6&idc=maliva&s=AWEME_DETAIL','https://v16m-default.tiktokcdn.com/09001e555075956eb0716e0837327adb/68370704/video/tos/useast2a/tos-useast2a-ve-0068c004/oYcBkIKEB7wotAt3oifCA6Q4Dig8C0gCE4uI4N/?a=0&bti=OTg7QGo5QHM6OjZALTAzYCMvcCMxNDNg&ch=0&cr=0&dr=0&er=0&lr=all&net=0&cd=0%7C0%7C0%7C0&cv=1&br=2866&bt=1433&cs=0&ds=6&ft=EeF4ntZWD0hQ12NvmSSyWIxREUi8Eq_45SY&mime_type=video_mp4&qs=0&rc=aDo6ZTxlMzg0Z2Q1NzlpNUBpM3FmaXI5cjh1MzMzNzczM0AzYy1gYWMzXjAxYF41NjRgYSNrNDRkMmRjNTNhLS1kMTZzcw%3D%3D&vvpl=1&l=20250528145204C73C5A0947484F0B6595&btag=e000b8000','https://v16m-default.tiktokcdn.com/09001e555075956eb0716e0837327adb/68370704/video/tos/useast2a/tos-useast2a-ve-0068c004/oYcBkIKEB7wotAt3oifCA6Q4Dig8C0gCE4uI4N/?a=0&bti=OTg7QGo5QHM6OjZALTAzYCMvcCMxNDNg&ch=0&cr=0&dr=0&er=0&lr=all&net=0&cd=0%7C0%7C0%7C0&cv=1&br=2866&bt=1433&cs=0&ds=6&ft=EeF4ntZWD0hQ12NvmSSyWIxREUi8Eq_45SY&mime_type=video_mp4&qs=0&rc=aDo6ZTxlMzg0Z2Q1NzlpNUBpM3FmaXI5cjh1MzMzNzczM0AzYy1gYWMzXjAxYF41NjRgYSNrNDRkMmRjNTNhLS1kMTZzcw%3D%3D&vvpl=1&l=20250528145204C73C5A0947484F0B6595&btag=e000b8000',16,683,48,0,0,0,1,'6772574422114960385','riri⋆.ೃ࿔*:･','https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/07bdbc3654c14475900152223a3e7520~tplv-tiktokx-cropcenter:300:300.jpeg?dr=14577&refresh_token=dbad40ec&x-expires=1748498400&x-signature=8LGgykT07OYEFWoyAUvC8cBc%2BEo%3D&t=4d5b0474&ps=13740610&shp=45126217&shcp=d05b14bd&idc=maliva','7360029845722876677','original sound - starc_creature','wonwoo~',3022065,0,'ID',1745728550,'2025-05-28 06:52:04','2025-05-28 06:52:04'),(23,'v09044g40000d0ivig7og65u2iun2g40','7504678624990219525','não importa a nacionalidade, o homem sempre vai estar errado','https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/osjLIkeAhGAXeAACAfLJFGgABRQAdIQlQHeZLI~tplv-tiktokx-dmt-logoccm:300:400:tos-useast2a-v-0068/okRAJCfEggSuQwGSjQEljOAeASIEFjIAD1Bf8L.jpeg?dr=14578&refresh_token=6246c756&x-expires=1748498400&x-signature=RcaqswRg4ZH1txMcLjDhw4ABaG4%3D&t=4d5b0474&ps=13740610&shp=d05b14bd&shcp=34ff8df6&idc=maliva&s=AWEME_DETAIL','https://v16m-default.tiktokcdn.com/3a1bb60dfad7b0673b96691ee30d538a/68370714/video/tos/useast2a/tos-useast2a-pve-0068/osmgIHLEjSXfilJQeggfGIOSQAKQr8DICAYCFC/?a=0&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&ch=0&cr=0&dr=0&er=0&lr=all&net=0&cd=0%7C0%7C0%7C0&cv=1&br=2440&bt=1220&cs=0&ds=6&ft=EeF4ntZWD0hQ12NvxSSyWIxREUi8Eq_45SY&mime_type=video_mp4&qs=0&rc=ZjgzNjQ1aTY1ZjQ3ZTxlaEBpM2pxbHg5cmp5MzMzNzczM0A1YTAwMy5fXzYxXjUzMmMuYSMxL3IvMmQ0ZmZhLS1kMTZzcw%3D%3D&vvpl=1&l=202505281452129ABD74FF376A2D09FD38&btag=e000b8000','https://v16m-default.tiktokcdn.com/41ce045ea2899f1c0e465f26cb627c5a/68370714/video/tos/useast2a/tos-useast2a-ve-0068c001/ooQLIgCgjerSAIDQKFphfg6XQl8IAEHgSifYCw/?a=0&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&ch=0&cr=0&dr=0&er=0&lr=all&net=0&cd=0%7C0%7C0%7C0&cv=1&br=2538&bt=1269&cs=0&ds=3&ft=EeF4ntZWD0hQ12NvxSSyWIxREUi8Eq_45SY&mime_type=video_mp4&qs=0&rc=OzM6ODk7ZmQ1OTtmZTZlM0BpM2pxbHg5cmp5MzMzNzczM0AyXzVeMi9fX2IxMWJfYy5iYSMxL3IvMmQ0ZmZhLS1kMTZzcw%3D%3D&vvpl=1&l=202505281452129ABD74FF376A2D09FD38&btag=e000b8000',24,1856,30,0,46,89,5,'6766748517085266949','Vamos a luta filhos da Pátria','https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/232d099c33ef2918355c907f96a2d6dc~tplv-tiktokx-cropcenter:300:300.jpeg?dr=14577&refresh_token=a884ef45&x-expires=1748498400&x-signature=dq4IZd2hDDBfQjdWmP%2BhIz83xIw%3D&t=4d5b0474&ps=13740610&shp=45126217&shcp=d05b14bd&idc=maliva','7504678620116421382','original sound - vamos.a.luta.filho','Vamos a luta filhos da Pátria',3785931,3938247,'BR',1747319161,'2025-05-28 06:52:13','2025-05-28 06:52:13'),(24,'v09044g40000d0e8egvog65kjbgncac0','7502021052743044407','Dulu sama mama ditolak ,sekarang sama istri juga😩 #pasutri #suamiistri #couple ','https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/oAdoQ2AZEiAbEFAgki0CcBFBDIVUEjAfoAliAI~tplv-tiktokx-cropcenter:300:400.jpeg?dr=14579&refresh_token=21447abc&x-expires=1748498400&x-signature=g4C%2BQdAoiYQkmvOQx2I3bacBePw%3D&t=4d5b0474&ps=13740610&shp=d05b14bd&shcp=34ff8df6&idc=maliva&s=AWEME_DETAIL','https://v16m-default.tiktokcdn.com/4ea827a367846f4147b7572fec0e88ce/68370723/video/tos/useast2a/tos-useast2a-pve-0068/oQHCYfkc2ohIBjFEQF0iAhAkigDiI6hu0KOmR4/?a=0&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&ch=0&cr=0&dr=0&er=0&lr=all&net=0&cd=0%7C0%7C0%7C0&cv=1&br=2324&bt=1162&cs=0&ds=6&ft=EeF4ntZWD0hQ12NvlSSyWIxRW2V8Eq_45SY&mime_type=video_mp4&qs=0&rc=PDdoOmY8OGQ0ZDppNWlkZUBpM2RxZW45cmo7MzMzNzczM0BeMzE0YzBfXzUxLzQ1L2BfYSNgYGRnMmRzYmJhLS1kMTZzcw%3D%3D&vvpl=1&l=202505281452145AC0A6C13DF9FE09D4C2&btag=e00088000','https://v16m-default.tiktokcdn.com/28453e8e4b10d58bc2b0703d12289d94/68370723/video/tos/useast2a/tos-useast2a-pve-0068/oMNs3eDDQFAdIzBHwgEJxEELBpI3fRL5ocOgQU/?a=0&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&ch=0&cr=0&dr=0&er=0&lr=all&net=0&cd=0%7C0%7C0%7C0&cv=1&br=2590&bt=1295&cs=0&ds=3&ft=EeF4ntZWD0hQ12NvlSSyWIxRW2V8Eq_45SY&mime_type=video_mp4&qs=0&rc=ZWQ6Njg6ZjQ2Njc7Zzc0OUBpM2RxZW45cmo7MzMzNzczM0BjM14vXi8xNTQxMDVjMl42YSNgYGRnMmRzYmJhLS1kMTZzcw%3D%3D&vvpl=1&l=202505281452145AC0A6C13DF9FE09D4C2&btag=e00088000',37,7164019,319230,2970,4856,350,4973,'6832664715643814913','Frans Faisal','https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/f768d854d351fa1304b63b63d676aab8~tplv-tiktokx-cropcenter:300:300.jpeg?dr=14577&refresh_token=1beda61e&x-expires=1748498400&x-signature=eVXzfplgwEno9mbjpPsxQ9D27%2BY%3D&t=4d5b0474&ps=13740610&shp=45126217&shcp=d05b14bd&idc=maliva','7502021051346701062','original sound - fransfaisal_real','Frans Faisal',5536586,6173563,'ID',1746700394,'2025-05-28 06:52:14','2025-05-28 06:52:14');
/*!40000 ALTER TABLE `videos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'tiktok_downloader'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-28 14:14:39
