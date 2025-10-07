# Knight Run API - Overview

The API of fitness and exercise software Knight Run!

Knight Run! is an Android mobile game application for running scenarios. Through setting up checkpoint challenges and combat rewards, the game aims to enrich users' exercise experience. The game is set in afantasy Western-style world where users play as a novice knight, embarking on various adventures and treasure hunts in the virtual world through real-world running activities. The game application is bound to users' real-world activities, allowing players to use the app during any outdoor running or walking exercise. 

When players launch the game, they will play as a little knight adventuring in a virtual world, and players can start running exercises at any time. The game primarily guides players through voice prompts during their run, while players can also check the app screen for information at any time. During gameplay, players will encounter various fantasy monsters or challenges, which they must overcome through real-world running time competitions or running distance. After defeating monsters, players receive various rewards to help with their next "adventure," such as obtaining potions to increase next rest time, or swords to increase damage dealt at the same distance in future runs.

This API is deployed on Render: https://dashboard.render.com/web/srv-d34lg7er433s73cnonag (I know none of you can access it, so this passage is just a reminder for me🤪)
This is available to everyone 👉 use https://knightrun-api.onrender.com/api/health to check it's health

----

# API Version & Commit Guidelines

## Version Number Format

### Format: `x.y.z(b)`

- **x** - Major version (stable release)
- **y** - Minor version (new features)
- **z** - Patch version (bug fixes)
- **b** - Beta/Untested flag (optional)

### Examples
- `0.1.0b` - First feature implementation, untested
- `0.1.0` - First feature, tested and stable
- `0.2.0b` - Second feature added, untested
- `0.2.1` - Bug fix for second feature
- `1.0.0` - First major stable release

## Version Increment Rules

### When to increment **x** (Major):
- First production-ready release (0.x.x → 1.0.0)
- Breaking API changes that affect client compatibility
- Complete system redesign or architecture change
- **Remove 'b' flag when promoted to stable**

### When to increment **y** (Minor):
- New API endpoints added
- New features in existing endpoints
- New database fields or tables
- Backward-compatible functionality additions
- **Add 'b' flag if untested**

### When to increment **z** (Patch):
- Bug fixes
- Performance improvements
- Documentation updates
- Security patches
- Code refactoring without new features
- **Add 'b' flag if untested**

### When to use **b** (Beta):
- Code has not been tested
- Functionality works but needs validation
- Awaiting peer review or QA
- **Remove after successful testing**

----

# API Frequently Asked Questions (FAQ)

## 🚀 Deployment & Access

### Q: Why can't I log in on the first attempt, even with the stable version?
**A:** Due to the limitations of the free tier deployment platform, the API server enters sleep mode after 15 minutes of inactivity. When you send your first request after this period, the server needs approximately **40 seconds to wake up and become active** again. 

**What to do:**
- Wait for 40-60 seconds after your first login attempt fails
- Try logging in again - the second attempt should succeed immediately
- Keep the app active to maintain the server's wake state
- If there are no requests for 15 minutes, the API will enter sleep mode again

**Tips to avoid this:**
- The server remains active as long as requests are made within 15-minute intervals
- Consider upgrading to a paid tier for 24/7 uptime (future consideration)


## 🔐 Authentication & Registration

### Q: Why does registration fail with "Username already exists"?
**A:** The username check is **case-sensitive**. This means:
- `TestUser` and `testuser` are different usernames
- `JohnDoe` and `johndoe` are different usernames
- Make sure you're using the exact username you want

### Q: What happens if I forget my password?
**A:** Check it out of the database yourself😡
- The default account passwords are all 12345678

### Q: What are the default values when I register?
**A:** New users receive:
- **Level:** 1
- **Experience Points:** 0
- **Class Points:** 0
- **Gold Coins:** 100
- **Silver Coins:** 50
- **Credits:** 10
- **Consecutive Days:** 0
- **Treasure Found:** 0
- **Exploring Location:** Melbourne
- **Equipped Items:** `{"trace": 3, "avatar": 1, "banner": 2}`
- **Owned Items:** `[1, 2, 3]`

## 🔧 Technical Issues

### Q: I'm getting a "500 Internal Server Error" - what does this mean?
**A:** This indicates a server-side error. Common causes:
1. **Database connection issue**: Wait a few seconds and retry
2. **Invalid data format**: Check that your request data matches the required format
3. **Server overload**: Wait 30-60 seconds for the server to stabilize

**If the error persists:**
- Check the API health endpoint: `https://knightrun-api.onrender.com/api/health`
- Contact the development team with error details

### Q: What does "409 Conflict" error mean during registration?
**A:** This means the username you're trying to register already exists in the database. Try a different username.

### Q: I'm getting "Network Error" or "Connection Failed" - what should I do?
**A:** Check the following:
1. **Internet connection**: Ensure you have active internet
2. **API status**: Visit `https://knightrun-api.onrender.com/api/health`
3. **Server wake time**: If it's the first request in 15+ minutes, wait 40-60 seconds
4. **Firewall/VPN**: Some networks may block API requests
