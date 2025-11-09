# AWS SNS Setup Guide

## ✅ Configuration Complete

Your application is now configured to use AWS SNS for sending OTP SMS messages!

## 📋 What Was Done

1. ✅ Added AWS configuration to `.env` file
2. ✅ Removed hardcoded AWS credentials (security fix)
3. ✅ Updated `otp.service.js` to use `SMS_MODE` environment variable
4. ✅ AWS SDK (`@aws-sdk/client-sns`) is already installed

## 🔧 Setup Steps

### Step 1: Get AWS Credentials

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Go to **IAM (Identity and Access Management)**
3. Create a new user or use existing user
4. Attach policy: `AmazonSNSFullAccess` (or create custom policy with only SMS permissions)
5. Create **Access Keys** and save them securely

### Step 2: Configure AWS SNS for SMS

1. Go to **AWS SNS** in the console
2. Navigate to **Text messaging (SMS)** → **Mobile text messaging**
3. Set up **Origination identities** (sender ID)
4. Configure **SMS preferences**:
   - Default message type: **Transactional**
   - Account spending limit (optional)

### Step 3: Update Your `.env` File

Open `.env` and update these values with your actual AWS credentials:

```env
# AWS SNS Configuration
AWS_REGION=us-east-1                    # Your AWS region
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXX        # Your AWS Access Key
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxx   # Your AWS Secret Key
AWS_SNS_SENDER_ID=WhatsApp              # Your app name (sender ID)

# SMS Mode
SMS_MODE=development  # Change to 'production' when ready to send real SMS
```

### Step 4: Test in Development Mode

Currently, `SMS_MODE=development` so OTPs will be logged to console:

```bash
node src/server.js
```

When you call the login endpoint, you'll see:
```
==================================================
📱 DEVELOPMENT MODE - OTP NOT SENT VIA SMS
📞 Phone: +1234567890
🔐 OTP Code: 123456
==================================================
```

### Step 5: Enable Production SMS Sending

When ready to send real SMS messages:

1. Update `.env`:
   ```env
   SMS_MODE=production
   ```

2. Restart your server

3. OTPs will now be sent via AWS SNS to real phone numbers!

## 💰 AWS SNS Pricing (Approximate)

- **US**: ~$0.00645 per SMS
- **International**: Varies by country (check [AWS SNS Pricing](https://aws.amazon.com/sns/sms-pricing/))
- **Monthly**: First 100 SMS free (AWS Free Tier for 1 year)

## ⚠️ Important Notes

### Phone Number Format
Always use international format: `+[country_code][number]`
- ✅ Correct: `+919876543210` (India)
- ✅ Correct: `+12025551234` (USA)
- ❌ Wrong: `9876543210`

### Security
- ⚠️ **NEVER commit `.env` to Git!** (already in `.gitignore`)
- ⚠️ Use IAM user with **minimum required permissions**
- ⚠️ Rotate AWS credentials regularly

### Testing
- Test with your own phone number first
- Some countries require **Sender ID registration**
- Check AWS SNS **sandbox mode** if enabled

## 🧪 Testing the Setup

### Test 1: Development Mode (Console Log)
```bash
# .env: SMS_MODE=development
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890"}'
```

Check console for OTP.

### Test 2: Production Mode (Real SMS)
```bash
# .env: SMS_MODE=production
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+YOUR_ACTUAL_PHONE"}'
```

Check your phone for SMS.

## 🔍 Troubleshooting

### Error: "Missing credentials"
- Check if `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set in `.env`
- Restart the server after updating `.env`

### Error: "Invalid parameter: PhoneNumber"
- Ensure phone number starts with `+` and country code
- Example: `+919876543210` for India

### Error: "Endpoint request timed out"
- Check your AWS region in `.env`
- Verify AWS credentials are correct
- Check internet connection

### SMS not received
- Check AWS CloudWatch logs
- Verify phone number format
- Check if country is supported by AWS SNS
- Some countries require sender ID registration

## 📚 Additional Resources

- [AWS SNS SMS Documentation](https://docs.aws.amazon.com/sns/latest/dg/sns-mobile-phone-number-as-subscriber.html)
- [AWS SNS Supported Regions](https://docs.aws.amazon.com/sns/latest/dg/sns-supported-regions-countries.html)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

## 🎯 Quick Start Checklist

- [ ] Get AWS credentials from IAM console
- [ ] Update `.env` with AWS credentials
- [ ] Keep `SMS_MODE=development` for testing
- [ ] Test login endpoint (should log OTP to console)
- [ ] Verify OTP verification works
- [ ] Change `SMS_MODE=production` when ready
- [ ] Test with your real phone number
- [ ] Monitor AWS SNS costs in Billing dashboard

---

**Need Help?** Check AWS CloudWatch Logs for detailed error messages from SNS.
