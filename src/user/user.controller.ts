import { Controller, Post, Body, Get, NotFoundException, Put, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { VerifyOTPDto } from './dto/verify-otp-user.dto';
import { ResendOTPDto } from './dto/resend-otp-user.dto';
import { LogoutUserDto } from './dto/logout-user.dto';
import { ChangePwdDto } from './dto/change-pwd-user.dto';
import { ForgotPwdDto } from './dto/forgot-pwd-user.dto';
import { ResetPwdDto } from './dto/reset-pwd-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Query, BadRequestException } from "@nestjs/common";
import { Delete } from '@nestjs/common'; 
import { Any } from 'typeorm';
import { AdminService } from './admin/admin.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService,
              private readonly adminService: AdminService
  ) {}


  @Get('all')
  async getAllUsers() {
    return this.adminService.findAll();
  }

  @Get('role')
  async getUserRole(@Query('email') email: string) {
    return this.adminService.getUserRole(email);
  }

  @Put('update/:id')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.adminService.updateUser(id, updateUserDto);
  }

  @Delete('delete/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('/register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.save(createUserDto);
  }

  @Post('/verify-otp')
  verifyOtp(@Body() verifyotp: VerifyOTPDto) {
    return this.userService.verifyOtp(verifyotp.email, verifyotp.otp);
  }

  @Post('/resend-otp')
  async resendOtp(@Body() { email }: ResendOTPDto) {
    return this.userService.resendOtp(email);
  }

  @Post('/login')
  login(@Body() { email, password }: LoginUserDto) {
    return this.userService.login(email, password);
  }

  @Post('/changepwd')
  changepwd(@Body() { email, password, newpwd }: ChangePwdDto) {
    return this.userService.changepwd(email, password, newpwd);
  }

  @Post('/forgotpwd')
  forgotpwd(@Body() { email }: ForgotPwdDto) {
    return this.userService.forgotPassword(email);
  }

  @Post('/resetpwd')
  resetpwd(@Body() { email, newpwd }: ResetPwdDto) {
    return this.userService.resetPassword(email, newpwd);
  }

  @Put(":email")
  async update(
    @Param("email") email: string,
    @Body() { first_name, last_name, mobile_no, role }: UpdateUserDto
) {
    try {
        const updatedUser = await this.userService.update(
            email.toLowerCase(),
            first_name ? first_name.trim() : '',
            last_name ? last_name.trim() : '',
            mobile_no ? mobile_no.trim() : '',
            role ? role.trim() : 'user'
        );

        return { message: "User updated successfully!", user: updatedUser };
    } catch (error) {
        throw new BadRequestException(error.message || "Failed to update user.");
    }
}

  
  @Post('/logout')
  async logout(@Body() { email }: LogoutUserDto) {
    const user = await this.userService.getUserByEmail(email.toLowerCase());
    if (!user) {
      throw new NotFoundException("User not found.");
    }
    await this.userService.logout(email.toLowerCase());
    return { message: "User logged out successfully!" };
  }
  
  
  @Get("/profile")
  async getProfile(@Query("email") email: string) {
      if (!email) throw new BadRequestException("Email is required.");
  
      const user = await this.userService.getUserByEmail(email.toLowerCase());
  
      if (!user) throw new NotFoundException("No user found with this email.");
      
      return { message: "User profile fetched successfully!", user };
  }
}
