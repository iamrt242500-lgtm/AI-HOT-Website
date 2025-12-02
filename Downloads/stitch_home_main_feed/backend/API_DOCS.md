# API Documentation

AI/IT News Aggregation Backend API 상세 문서

Base URL: `http://localhost:3001/api`

## Authentication

인증이 필요한 엔드포인트는 JWT 토큰을 헤더에 포함해야 합니다:

```
Authorization: Bearer <your_jwt_token>
```

## News Endpoints

### GET /news/latest

최신 뉴스 목록을 가져옵니다.

**Query Parameters:**
- `page` (number, optional): 페이지 번호 (기본값: 1)
- `limit` (number, optional): 페이지당 항목 수 (기본값: 20)

**Response:**
```json
{
  "news": [
    {
      "id": 1,
      "title": "NVIDIA's Blackwell GPU platform...",
      "summary": "NVIDIA announces...",
      "source": "x",
      "url": "https://...",
      "thumbnail": "https://...",
      "tags": ["AI", "GPU"],
      "timestamp": "2024-11-27T08:00:00Z",
      "stats": {
        "views": 150,
        "clicks": 45
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25
  }
}
```

### GET /news/trending

인기 뉴스를 가져옵니다 (조회수, 클릭수, 최신성 기반).

**Query Parameters:**
- `page` (number, optional): 페이지 번호
- `limit` (number, optional): 페이지당 항목 수

**Response:**
```json
{
  "news": [...]
}
```

### GET /news/search

키워드로 뉴스를 검색합니다.

**Query Parameters:**
- `keyword` (string, required): 검색 키워드
- `page` (number, optional): 페이지 번호
- `limit` (number, optional): 페이지당 항목 수

**Response:**
```json
{
  "keyword": "AI",
  "news": [...],
  "count": 42
}
```

### GET /news/:id

특정 뉴스의 상세 정보를 가져옵니다.

**Response:**
```json
{
  "id": 1,
  "title": "...",
  "summary": "...",
  "content": "Full content...",
  "source": "medium",
  "url": "https://...",
  "thumbnail": "https://...",
  "tags": ["AI", "Cloud"],
  "timestamp": "2024-11-27T08:00:00Z",
  "stats": {
    "views": 150,
    "clicks": 45
  }
}
```

### GET /news/source/:source

특정 소스의 뉴스만 가져옵니다.

**Path Parameters:**
- `source`: 소스 이름 (x, medium, reddit, facebook, instagram)

**Response:**
```json
{
  "source": "medium",
  "news": [...]
}
```

### POST /news/:id/click

뉴스 클릭을 추적합니다.

**Response:**
```json
{
  "success": true
}
```

## User Endpoints

### POST /user/register

새 사용자를 등록합니다.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "interests": ["AI", "Cloud", "Robotics"]
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "interests": ["AI", "Cloud", "Robotics"],
    "createdAt": "2024-11-27T08:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /user/login

사용자 로그인.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "interests": ["AI", "Cloud"]
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /user/save

뉴스를 북마크에 저장하거나 해제합니다. (인증 필요)

**Request Body:**
```json
{
  "newsId": 123
}
```

**Response:**
```json
{
  "saved": true,
  "message": "News saved"
}
```

### GET /user/saved

저장된 뉴스 목록을 가져옵니다. (인증 필요)

**Response:**
```json
{
  "news": [
    {
      "id": 123,
      "title": "...",
      "summary": "...",
      "savedAt": "2024-11-27T10:00:00Z",
      ...
    }
  ]
}
```

### GET /user/recommend

개인화된 추천 뉴스를 가져옵니다. (인증 필요)

**Query Parameters:**
- `page` (number, optional): 페이지 번호
- `limit` (number, optional): 페이지당 항목 수

**Response:**
```json
{
  "news": [...]
}
```

### PUT /user/interests

사용자 관심사를 업데이트합니다. (인증 필요)

**Request Body:**
```json
{
  "interests": ["AI", "Cloud Computing", "Cybersecurity"]
}
```

**Response:**
```json
{
  "success": true,
  "interests": ["AI", "Cloud Computing", "Cybersecurity"]
}
```

### GET /user/profile

사용자 프로필을 가져옵니다. (인증 필요)

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "interests": ["AI", "Cloud"],
    "createdAt": "2024-11-27T08:00:00Z",
    "savedCount": 15
  }
}
```

## Trend Endpoints

### GET /trend/keywords

트렌딩 키워드 목록을 가져옵니다.

**Query Parameters:**
- `limit` (number, optional): 결과 개수 (기본값: 20)

**Response:**
```json
{
  "keywords": [
    {
      "keyword": "AI",
      "weight": 100,
      "count": 150,
      "updatedAt": "2024-11-27T08:00:00Z"
    },
    {
      "keyword": "Cloud",
      "weight": 85,
      "count": 120,
      "updatedAt": "2024-11-27T08:00:00Z"
    }
  ]
}
```

### GET /trend/topics

Hot Topics (최근 24시간 트렌딩 키워드)를 가져옵니다.

**Query Parameters:**
- `limit` (number, optional): 결과 개수 (기본값: 10)

**Response:**
```json
{
  "topics": [
    {
      "name": "AI",
      "weight": 100
    },
    {
      "name": "MachineLearning",
      "weight": 90
    }
  ]
}
```

### GET /trend/stats

플랫폼 전체 통계를 가져옵니다.

**Response:**
```json
{
  "totalNews": 5000,
  "recentNews": 150,
  "bySource": [
    {
      "source": "medium",
      "count": 1500
    },
    {
      "source": "x",
      "count": 1200
    }
  ],
  "popularTags": [
    {
      "tag": "AI",
      "count": 500
    }
  ]
}
```

## Error Responses

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "error": "Error message"
}
```

### Common HTTP Status Codes

- `200`: 성공
- `201`: 생성 성공
- `400`: 잘못된 요청
- `401`: 인증 필요 또는 인증 실패
- `404`: 리소스를 찾을 수 없음
- `409`: 충돌 (예: 이미 존재하는 사용자)
- `500`: 서버 오류

## Rate Limiting

API는 IP당 15분에 100개 요청으로 제한됩니다.

## Caching

- 최신 뉴스: 5분 캐싱
- 트렌딩 뉴스: 10분 캐싱
- 추천 피드: 15분 캐싱
- 뉴스 상세: 1시간 캐싱

## Example Usage

### JavaScript (Fetch API)

```javascript
// 최신 뉴스 가져오기
const response = await fetch('http://localhost:3001/api/news/latest?page=1&limit=20');
const data = await response.json();
console.log(data.news);

// 로그인
const loginResponse = await fetch('http://localhost:3001/api/user/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});
const { token } = await loginResponse.json();

// 인증이 필요한 요청
const savedNews = await fetch('http://localhost:3001/api/user/saved', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const savedData = await savedNews.json();
```

### cURL

```bash
# 최신 뉴스
curl http://localhost:3001/api/news/latest

# 로그인
curl -X POST http://localhost:3001/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# 뉴스 검색
curl "http://localhost:3001/api/news/search?keyword=AI"

# 뉴스 저장 (인증 필요)
curl -X POST http://localhost:3001/api/user/save \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newsId":123}'
```
