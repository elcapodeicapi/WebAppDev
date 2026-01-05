# Room Booking System Test Guide

## ✅ How to Test the Room Booking System

### 🚀 Step 1: Make a Room Booking

1. **Go to Room Booking Page**: `http://localhost:5173/room-booking`
2. **Select a Room**: Click on any room card
3. **Fill Out Form**:
   - Date: Select today or a future date
   - Start Time: Choose any time (e.g., 9:00 AM)
   - Duration: Select 1-4 hours
   - Purpose: Add a purpose (e.g., "Team Meeting")
4. **Click "🎯 Book Room"**
5. **Check Console**: Look for "Booking successful!" message

### 🔍 Step 2: Check Profile for Bookings

1. **Go to Profile Page**: `http://localhost:5173/profile`
2. **Look for "🏢 My Room Bookings" section**
3. **Your booking should appear** with:
   - Room name and location
   - Date and time
   - Duration
   - Purpose

### 🔄 Step 3: Test Refresh Functionality

1. **Click "🔄 Refresh" button** in the room bookings section
2. **Console should show**: "=== PROFILE: Fetching room bookings ==="
3. **Bookings should reload** if there are any changes

### 🐛 Debug Information

**Console Logs to Check**:
- Room booking: "=== BOOKING REQUEST DEBUG ==="
- Profile: "=== PROFILE: Fetching room bookings ==="

**Expected Flow**:
1. User books room → Booking saved with UserId
2. Profile fetches bookings → Shows only that user's bookings
3. Booking appears in profile → User can see their upcoming bookings

### 📱 Expected Results

**After booking a room, you should see in profile**:
```
🏢 My Room Bookings 🔄 Refresh
📍 Conference Room A
📅 1/5/2026 • ⏰ 09:00 - 11:00
👥 10 people • 📍 Main Building
📝 Team Meeting
```

**If no bookings**:
```
🏢 My Room Bookings 🔄 Refresh
No upcoming room bookings.
```

### 🔧 Technical Verification

**Backend Endpoints**:
- `POST /api/roombookings/book` - Creates booking with UserId
- `GET /api/roombookings/mine` - Returns only user's bookings

**Database Check**:
- RoomBookings table has UserId column
- Bookings are filtered by UserId in "mine" endpoint
- Only future bookings (today onwards) are shown

This system ensures that when a user books a room, it's associated with their user ID and will appear in their profile page under "My Room Bookings".
