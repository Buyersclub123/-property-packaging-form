# GHL API Integration Plan - Sourcer/Packager Dropdowns

## Current Implementation
- **Status:** Using hardcoded list of sourcer names
- **Location:** `src/lib/sourcerList.ts`
- **Component:** `Step0AddressAndRisk.tsx` uses dropdown with hardcoded options

## Future Implementation: GHL API Integration

### Step 1: Create API Route
Create: `src/app/api/ghl/users/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    
    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL API credentials not configured' },
        { status: 500 }
      );
    }

    // GHL API endpoint for users
    const response = await fetch(
      `https://services.leadconnectorhq.com/users/?locationId=${locationId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GHL API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filter for Property Team Members
    // Adjust filter based on your GHL setup (role, team, tags, etc.)
    const propertyTeamMembers = data.users?.filter((user: any) => {
      // Example filters (adjust based on your GHL structure):
      // - user.role === 'Property Team Member'
      // - user.tags?.includes('Property Team')
      // - user.team === 'Property'
      return user.role === 'Property Team Member' || user.tags?.includes('Property Team');
    }) || [];

    // Format for dropdown
    const formattedUsers = propertyTeamMembers.map((user: any) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('GHL API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users from GHL' },
      { status: 500 }
    );
  }
}
```

### Step 2: Update `sourcerList.ts`
Replace the `getSourcers()` function:

```typescript
export async function getSourcers(): Promise<SourcerOption[]> {
  try {
    const response = await fetch('/api/ghl/users');
    if (response.ok) {
      const users = await response.json();
      return users.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch sourcers from GHL:', error);
  }
  
  // Fallback to hardcoded list if API fails
  return HARDCODED_SOURCERS;
}
```

### Step 3: Environment Variables
Add to `.env.local`:

```env
GHL_API_KEY=your_ghl_api_key_here
GHL_LOCATION_ID=your_location_id_here
```

### Step 4: GHL API Documentation
- **Base URL:** `https://services.leadconnectorhq.com/`
- **Users Endpoint:** `GET /users/?locationId={locationId}`
- **Authentication:** Bearer token in Authorization header
- **Documentation:** https://highlevel.stoplight.io/docs/integrations

### Step 5: Filtering Logic
You'll need to determine how to identify "Property Team Members" in GHL:
- **Option A:** Filter by role (if roles are set up)
- **Option B:** Filter by team (if teams are set up)
- **Option C:** Filter by tags (if tags are used)
- **Option D:** Filter by custom field (if custom fields exist)

### Step 6: Caching Strategy
The current implementation includes caching (5 minutes). Consider:
- **Server-side caching:** Cache in API route with Redis or similar
- **Client-side caching:** Already implemented in `getCachedSourcers()`
- **Cache invalidation:** Clear cache when users are added/removed in GHL

### Step 7: Error Handling
- **API fails:** Fallback to hardcoded list (already implemented)
- **Network error:** Show error message, use cached data if available
- **Invalid credentials:** Log error, use hardcoded list

### Step 8: Testing
1. Test with valid GHL API credentials
2. Test with invalid credentials (should fallback)
3. Test with network error (should fallback)
4. Verify filtering logic matches your GHL structure
5. Test caching behavior

## Benefits of GHL API Integration
1. **Automatic updates:** New team members automatically appear
2. **Full names & emails:** Can display "John Doe (john@example.com)"
3. **Consistency:** Same list across all forms/systems
4. **No manual maintenance:** No need to update code when team changes

## Migration Checklist
- [ ] Get GHL API credentials
- [ ] Determine filtering criteria (role/team/tags)
- [ ] Create API route (`/api/ghl/users`)
- [ ] Update `sourcerList.ts` to use API
- [ ] Add environment variables
- [ ] Test API integration
- [ ] Test fallback behavior
- [ ] Update Packager dropdown (same approach)
- [ ] Remove hardcoded list (or keep as fallback)


