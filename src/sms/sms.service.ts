import { Injectable, BadRequestException } from '@nestjs/common';
import * as Twilio from 'twilio';

@Injectable()
export class SmsService {
  private client: Twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in environment variables');
    }

    this.client = Twilio(accountSid, authToken);
  }

  async sendOtpSms(to: string, otp: string): Promise<{ message: string; phoneNumber: string }> {
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioPhoneNumber) {
      throw new Error('TWILIO_PHONE_NUMBER must be set in environment variables');
    }

    // Log the phone number being used
    console.log(`Sending OTP to phone number: ${to}`);

    // Validate phone number (E.164 format: e.g., +919328448222)
    if (!to || !/^\+\d{10,15}$/.test(to)) {
      throw new BadRequestException('Invalid phone number format. Use E.164 format (e.g., +919328448222)');
    }

    if (!otp || otp.length < 4) {
      throw new BadRequestException('OTP must be at least 4 digits');
    }

    try {
      await this.client.messages.create({
        body: `Your OTP is: ${otp}`,
        from: twilioPhoneNumber,
        to: to,
      });
      return {
        message: 'OTP sent successfully via SMS',
        phoneNumber: to, // Return the phone number used
      };
    } catch (error) {
      if (error.code === 21211) {
        throw new BadRequestException('Invalid phone number');
      } else if (error.code === 21614) {
        throw new BadRequestException('Phone number is not SMS-capable');
      } else {
        throw new BadRequestException(`Failed to send SMS: ${error.message}`);
      }
    }
  }
}