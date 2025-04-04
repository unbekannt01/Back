import { ApiProperty } from "@nestjs/swagger";

export class ResetPwdDto {

    @ApiProperty()
    email : string;

    @ApiProperty()
    newpwd : string;
}
