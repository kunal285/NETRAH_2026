/*
 * ==============================================================================
 * PRAHARI V3 — ESP32-CAM DEDICATED HIGH-SPEED WI-FI VIDEO STREAMER
 * ==============================================================================
 * Hardware Architecture:
 * - Module: AI-Thinker ESP32-CAM (OV2640 2MP Camera Sensor)
 * - Function: Strictly handles Wi-Fi connection and continuous low-latency MJPEG video streaming
 * - Port: HTTP port 80 / 8080 (Serves http://<ESP32_IP>/stream or /video)
 * - Independence: Zero motor control code; strictly isolated camera pipeline
 * ==============================================================================
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_timer.h"
#include "img_converters.h"
#include "Arduino.h"
#include "fb_gfx.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "esp_http_server.h"

// ------------------------------------------------------------------------------
// WI-FI CREDENTIALS
// ------------------------------------------------------------------------------
const char* ssid = "PRAHARI_AP";
const char* password = "prahari_robot_2026";

// ------------------------------------------------------------------------------
// AI-THINKER ESP32-CAM PIN MAPPING
// ------------------------------------------------------------------------------
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define FLASH_LED_PIN      4

#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t stream_httpd = NULL;

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char * part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if(res != ESP_OK) {
    return res;
  }
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while(true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("[ESP32-CAM] Frame capture failed");
      res = ESP_FAIL;
    } else {
      _jpg_buf_len = fb->len;
      _jpg_buf = fb->buf;
    }

    if(res == ESP_OK) {
      size_t hlen = snprintf((char *)part_buf, 64, _STREAM_PART, _jpg_buf_len);
      res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
    }
    if(res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    if(res == ESP_OK) {
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    }
    if(fb) {
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    } else if(_jpg_buf) {
      free(_jpg_buf);
      _jpg_buf = NULL;
    }
    if(res != ESP_OK) {
      break;
    }
  }
  return res;
}

static esp_err_t snapshot_handler(httpd_req_t *req) {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[ESP32-CAM] Snapshot capture failed");
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=snapshot.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return res;
}

void start_camera_server() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t video_uri = {
    .uri       = "/video",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t snap_uri = {
    .uri       = "/snapshot",
    .method    = HTTP_GET,
    .handler   = snapshot_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t cap_uri = {
    .uri       = "/capture",
    .method    = HTTP_GET,
    .handler   = snapshot_handler,
    .user_ctx  = NULL
  };

  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    httpd_register_uri_handler(stream_httpd, &video_uri);
    httpd_register_uri_handler(stream_httpd, &snap_uri);
    httpd_register_uri_handler(stream_httpd, &cap_uri);
    Serial.println("[ESP32-CAM] HTTP Streaming & Snapshot Server active on port 80");
  }
}

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector for stable power

  Serial.begin(115200);
  Serial.setDebugOutput(false);
  Serial.println("\n[ESP32-CAM] Initializing PRAHARI Mast Camera Module...");

  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW); // Flash off by default

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Frame size & quality configuration
  if(psramFound()) {
    config.frame_size = FRAMESIZE_VGA; // 640x480 for ultra low latency 25-30 FPS
    config.jpeg_quality = 12;          // 0-63 lower is higher quality
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 15;
    config.fb_count = 1;
  }

  // Camera Initialization
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[ESP32-CAM] Camera init failed with error 0x%x\n", err);
    return;
  }

  // Camera Sensor Adjustments
  sensor_t * s = esp_camera_sensor_get();
  if (s != NULL) {
    s->set_vflip(s, 1);       // Flip if mounted inverted
    s->set_brightness(s, 1);
    s->set_contrast(s, 1);
    s->set_saturation(s, 0);
  }

  // Wi-Fi Connection
  WiFi.begin(ssid, password);
  Serial.print("[ESP32-CAM] Connecting to Wi-Fi: ");
  Serial.println(ssid);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[ESP32-CAM] Wi-Fi Connected!");
    Serial.print("[ESP32-CAM] Live Stream URL: http://");
    Serial.print(WiFi.localIP());
    Serial.println("/video");
    start_camera_server();
  } else {
    // If router not found, start SoftAP
    Serial.println("\n[ESP32-CAM] Starting Access Point: PRAHARI_CAM_AP");
    WiFi.softAP("PRAHARI_CAM_AP", "12345678");
    Serial.print("[ESP32-CAM] AP IP: http://");
    Serial.print(WiFi.softAPIP());
    Serial.println("/video");
    start_camera_server();
  }
}

void loop() {
  delay(10000); // Server runs asynchronously in background tasks
}
