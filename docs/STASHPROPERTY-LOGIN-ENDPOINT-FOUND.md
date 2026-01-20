# Stashproperty Login Endpoint - FOUND ✅

## Login Endpoint Details

**URL:** `https://stashproperty.com.au/auth/api/login`

**Method:** `POST`

**Content-Type:** `application/json`

**Request Body:** (Need to confirm format - check Payload tab)
```json
{
  "email": "Ali.h@buyersclub.com.au",
  "password": "Buyersclub313!"
}
```
OR
```json
{
  "username": "Ali.h@buyersclub.com.au",
  "password": "Buyersclub313!"
}
```

**Response:** Returns tokens via `Set-Cookie` headers:
- `accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- `refreshToken=3ad2bab7-d1b4-43d1-9aac-b90b02402d84`
- `last-active-user=b6794945-e8ab-4f64-98b6-63e55976be06`

**Status Code:** 200 OK

---

## Important Notes

1. **Tokens are in Cookies, not Response Body**
   - Make.com HTTP module returns cookies in `Headers` → `Set-Cookie`
   - We need to extract them from headers

2. **Token Expiration**
   - `accessToken` expires (see `exp` in JWT)
   - `refreshToken` can be used to get new `accessToken`

3. **Cookie Format**
   - Cookies are HttpOnly and Secure
   - Need to extract values from `Set-Cookie` headers

---

## Next Steps

1. **Confirm Request Body Format** (check Payload tab)
2. **Create Login Module** in Make.com
3. **Create Cookie Extractor Module** (to get tokens from Set-Cookie headers)
4. **Update Stashproperty API Module** (to use fresh token)

---

**Status:** ✅ Endpoint Found  
**Next:** Confirm request body format, then create modules









