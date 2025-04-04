import { ApiProperty } from "@nestjs/swagger";

export class ForgotPwdDto {

    @ApiProperty()
    email : string;
}
