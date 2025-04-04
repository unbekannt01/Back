import { ApiProperty } from "@nestjs/swagger";
import { otp_type } from "../entities/user.entity";

export class VerifyOTPDto {

    @ApiProperty()
    email : string;

    @ApiProperty()
    otp : string;
}
