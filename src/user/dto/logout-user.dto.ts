import { ApiProperty } from "@nestjs/swagger";

export class LogoutUserDto {

    @ApiProperty()
    email : string;

}
