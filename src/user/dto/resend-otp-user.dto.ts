import { ApiProperty } from "@nestjs/swagger";

export class ResendOTPDto {

    @ApiProperty()
    email : string;

}
