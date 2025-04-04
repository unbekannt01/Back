import { ApiProperty } from "@nestjs/swagger";

export class ChangePwdDto {

    @ApiProperty()
    email:string

    @ApiProperty()
    password : string;

    @ApiProperty()
    newpwd : string;
}